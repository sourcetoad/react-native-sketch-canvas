#import "RNSketchCanvas.h"
#import "RNSketchData.h"
#import <React/RCTEventDispatcher.h>
#import <React/RCTView.h>
#import <React/UIView+React.h>
#import "Utility.h"

@implementation RNSketchCanvas
{
    NSMutableArray *_paths;
    RNSketchData *_currentPath;

    CGSize _lastSize;

    CGContextRef _drawingContext, _translucentDrawingContext;
    CGImageRef _frozenImage, _translucentFrozenImage;
    BOOL _needsFullRedraw;
    BOOL _canvasIsReady;

    UIImage *_backgroundImage;
    UIImage *_backgroundImageScaled;
    NSString *_backgroundImageContentMode;
    
    NSArray *_arrTextOnSketch, *_arrSketchOnText;
}

- (instancetype)initWithFrame:(CGRect)frame {
    if (self = [super initWithFrame:frame]) {
        _paths = [NSMutableArray new];
        _needsFullRedraw = YES;
        _canvasIsReady = NO;

        self.backgroundColor = [UIColor clearColor];
        self.clearsContextBeforeDrawing = YES;
    }
    return self;
}

- (void)invalidate {
    if (_drawingContext) {
        CGContextRelease(_drawingContext);
        _drawingContext = nil;
    }
    if (_translucentDrawingContext) {
        CGContextRelease(_translucentDrawingContext);
        _translucentDrawingContext = nil;
    }
    if (_frozenImage) {
        CGImageRelease(_frozenImage);
        _frozenImage = nil;
    }
    if (_translucentFrozenImage) {
        CGImageRelease(_translucentFrozenImage);
        _translucentFrozenImage = nil;
    }
    
    _backgroundImage = nil;
    _backgroundImageScaled = nil;
    _backgroundImageContentMode = nil;
    
    _arrTextOnSketch = nil;
    _arrSketchOnText = nil;
    [_paths removeAllObjects];
    _paths = nil;
    _currentPath = nil;
    _lastSize = CGSizeZero;
    _canvasIsReady = NO;
    _needsFullRedraw = YES;
}

- (void)dealloc {
    [self invalidate];
}

- (void)drawRect:(CGRect)rect {
    CGContextRef context = UIGraphicsGetCurrentContext();

    CGRect bounds = self.bounds;

    if (_needsFullRedraw) {
        [self setFrozenImageNeedsUpdate];
        CGContextClearRect(_drawingContext, bounds);
        for (RNSketchData *path in _paths) {
            @autoreleasepool {
                [path drawInContext:_drawingContext];
            }
        }
        _needsFullRedraw = NO;
    }

    if (!_frozenImage) {
        _frozenImage = CGBitmapContextCreateImage(_drawingContext);
    }
    
    if (!_translucentFrozenImage && _currentPath.isTranslucent) {
        _translucentFrozenImage = CGBitmapContextCreateImage(_translucentDrawingContext);
    }

    if (_backgroundImage) {
        if (!_backgroundImageScaled) {
            _backgroundImageScaled = [self scaleImage:_backgroundImage toSize:bounds.size contentMode: _backgroundImageContentMode];
        }

        [_backgroundImageScaled drawInRect:bounds];
    }

    for (CanvasText *text in _arrSketchOnText) {
        @autoreleasepool {
            [text.text drawInRect: text.drawRect withAttributes: text.attribute];
        }
    }
    
    if (_frozenImage) {
        CGContextDrawImage(context, bounds, _frozenImage);
    }

    if (_translucentFrozenImage && _currentPath.isTranslucent) {
        CGContextDrawImage(context, bounds, _translucentFrozenImage);
    }
    
    for (CanvasText *text in _arrTextOnSketch) {
        @autoreleasepool {
            [text.text drawInRect: text.drawRect withAttributes: text.attribute];
        }
    }
}

- (void)layoutSubviews {
    [super layoutSubviews];

    if (!CGSizeEqualToSize(self.bounds.size, _lastSize)) {
        _lastSize = self.bounds.size;
        if (_drawingContext) {
            CGContextRelease(_drawingContext);
            _drawingContext = nil;
        }
        if (_translucentDrawingContext) {
            CGContextRelease(_translucentDrawingContext);
            _translucentDrawingContext = nil;
        }
        [self createDrawingContext];
        _needsFullRedraw = YES;
        _backgroundImageScaled = nil;
        
        for (CanvasText *text in [_arrTextOnSketch arrayByAddingObjectsFromArray: _arrSketchOnText]) {
            @autoreleasepool {
                CGPoint position = text.position;
                if (!text.isAbsoluteCoordinate) {
                    position.x *= self.bounds.size.width;
                    position.y *= self.bounds.size.height;
                }
                position.x -= text.drawRect.size.width * text.anchor.x;
                position.y -= text.drawRect.size.height * text.anchor.y;
                text.drawRect = CGRectMake(position.x, position.y, text.drawRect.size.width, text.drawRect.size.height);
            }
        }
        
        [self setNeedsDisplay];
    } else if (!_drawingContext || !_translucentDrawingContext) {
        // Ensure contexts are recreated if they are nil (e.g. after invalidation)
        [self createDrawingContext];
        _needsFullRedraw = YES;
        [self setNeedsDisplay];
    }
}

- (void)createDrawingContext {
    if (!self.window) {
        // Window not available yet, defer context creation
        dispatch_async(dispatch_get_main_queue(), ^{
            if (self.window) {
                [self createDrawingContext];
            }
        });
        return;
    }
    
    CGFloat scale = self.window.screen.scale;
    CGSize size = self.bounds.size;
    
    // Don't create contexts for zero-sized views
    if (size.width == 0 || size.height == 0) {
        return;
    }
    
    size.width *= scale;
    size.height *= scale;
    
    // Release existing contexts if they exist
    if (_drawingContext) {
        CGContextRelease(_drawingContext);
        _drawingContext = nil;
        _canvasIsReady = NO;
    }
    if (_translucentDrawingContext) {
        CGContextRelease(_translucentDrawingContext);
        _translucentDrawingContext = nil;
        _canvasIsReady = NO;
    }
    
    CGColorSpaceRef colorSpace = CGColorSpaceCreateDeviceRGB();
    if (!colorSpace) {
        NSLog(@"Failed to create color space");
        return;
    }
    
    _drawingContext = CGBitmapContextCreate(nil, size.width, size.height, 8, 0, colorSpace, kCGImageAlphaPremultipliedLast);
    _translucentDrawingContext = CGBitmapContextCreate(nil, size.width, size.height, 8, 0, colorSpace, kCGImageAlphaPremultipliedLast);
    
    if (!_drawingContext || !_translucentDrawingContext) {
        NSLog(@"Failed to create bitmap contexts");
        if (_drawingContext) {
            CGContextRelease(_drawingContext);
            _drawingContext = nil;
        }
        if (_translucentDrawingContext) {
            CGContextRelease(_translucentDrawingContext);
            _translucentDrawingContext = nil;
        }
        _canvasIsReady = NO;
    } else {
        CGContextConcatCTM(_drawingContext, CGAffineTransformMakeScale(scale, scale));
        CGContextConcatCTM(_translucentDrawingContext, CGAffineTransformMakeScale(scale, scale));

        if (!_canvasIsReady) {
            if ([self.eventDelegate respondsToSelector:@selector(handleEvent:)]) {
                 [self.eventDelegate handleEvent: @{ @"eventType": @"onCanvasReady" }];
            }
            _canvasIsReady = YES;
        }
    }
    
    CGColorSpaceRelease(colorSpace);
    colorSpace = nil;
}

- (void)didMoveToWindow {
    [super didMoveToWindow];
    
    // Recreate contexts when window becomes available
    if (self.window && (!_drawingContext || !_translucentDrawingContext)) {
        [self createDrawingContext];
        _needsFullRedraw = YES;
        [self setNeedsDisplay];
    }
}

- (void)setFrozenImageNeedsUpdate {
    CGImageRelease(_frozenImage);
    CGImageRelease(_translucentFrozenImage);
    _frozenImage = nil;
    _translucentFrozenImage = nil;
}

- (BOOL)openSketchFile:(NSString *)filename directory:(NSString*) directory contentMode:(NSString*)mode {
    bool success = NO;
    if (filename) {
        @autoreleasepool {
            UIImage *image = [UIImage imageWithContentsOfFile: [directory stringByAppendingPathComponent: filename]];
            image = image ? image : [UIImage imageNamed: filename];
            if(image) {
                if (image.imageOrientation != UIImageOrientationUp) {
                    UIGraphicsBeginImageContextWithOptions(image.size, NO, image.scale);
                    [image drawInRect:(CGRect){0, 0, image.size}];
                    UIImage *normalizedImage = UIGraphicsGetImageFromCurrentImageContext();
                    UIGraphicsEndImageContext();
                    image = normalizedImage;
                    normalizedImage = nil;
                }
                _backgroundImage = image;
                _backgroundImageScaled = nil;
                _backgroundImageContentMode = mode;
                image = nil;
                [self setNeedsDisplay];

                success = YES;
            }
        }
    }
    return success;
}

- (void)setCanvasText:(NSArray *)aText {
    NSMutableArray *arrTextOnSketch = [NSMutableArray new];
    NSMutableArray *arrSketchOnText = [NSMutableArray new];
    NSDictionary *alignments = @{
                                 @"Left": [NSNumber numberWithInteger:NSTextAlignmentLeft],
                                 @"Center": [NSNumber numberWithInteger:NSTextAlignmentCenter],
                                 @"Right": [NSNumber numberWithInteger:NSTextAlignmentRight]
                                 };
    
    for (NSDictionary *property in aText) {
        @autoreleasepool {
            if (property[@"text"]) {
                NSMutableArray *arr = [@"TextOnSketch" isEqualToString: property[@"overlay"]] ? arrTextOnSketch : arrSketchOnText;
                CanvasText *text = [CanvasText new];
                text.text = property[@"text"];
                UIFont *font = nil;
                if (property[@"font"]) {
                    font = [UIFont fontWithName: property[@"font"] size: property[@"fontSize"] == nil ? 12 : [property[@"fontSize"] floatValue]];
                    font = font == nil ? [UIFont systemFontOfSize: property[@"fontSize"] == nil ? 12 : [property[@"fontSize"] floatValue]] : font;
                } else if (property[@"fontSize"]) {
                    font = [UIFont systemFontOfSize: [property[@"fontSize"] floatValue]];
                } else {
                    font = [UIFont systemFontOfSize: 12];
                }
                text.font = font;
                text.anchor = property[@"anchor"] == nil ?
                    CGPointMake(0, 0) :
                    CGPointMake([property[@"anchor"][@"x"] floatValue], [property[@"anchor"][@"y"] floatValue]);
                text.position = property[@"position"] == nil ?
                    CGPointMake(0, 0) :
                    CGPointMake([property[@"position"][@"x"] floatValue], [property[@"position"][@"y"] floatValue]);
                long color = property[@"fontColor"] == nil ? 0xFF000000 : [property[@"fontColor"] longValue];
                UIColor *fontColor =
                [UIColor colorWithRed:(CGFloat)((color & 0x00FF0000) >> 16) / 0xFF
                                green:(CGFloat)((color & 0x0000FF00) >> 8) / 0xFF
                                 blue:(CGFloat)((color & 0x000000FF)) / 0xFF
                                alpha:(CGFloat)((color & 0xFF000000) >> 24) / 0xFF];
                NSMutableParagraphStyle *style = [[NSParagraphStyle defaultParagraphStyle] mutableCopy];
                NSString *a = property[@"alignment"] ? property[@"alignment"] : @"Left";
                style.alignment = [alignments[a] integerValue];
                style.lineHeightMultiple = property[@"lineHeightMultiple"] ? [property[@"lineHeightMultiple"] floatValue] : 1.0;
                text.attribute = @{
                                   NSFontAttributeName:font,
                                   NSForegroundColorAttributeName:fontColor,
                                   NSParagraphStyleAttributeName:style
                                   };
                text.isAbsoluteCoordinate = ![@"Ratio" isEqualToString:property[@"coordinate"]];
                CGSize textSize = [text.text sizeWithAttributes:text.attribute];
                
                CGPoint position = text.position;
                if (!text.isAbsoluteCoordinate) {
                    position.x *= self.bounds.size.width;
                    position.y *= self.bounds.size.height;
                }
                position.x -= textSize.width * text.anchor.x;
                position.y -= textSize.height * text.anchor.y;
                text.drawRect = CGRectMake(position.x, position.y, textSize.width, textSize.height);
                [arr addObject: text];
            }
        }
    }
    _arrTextOnSketch = [arrTextOnSketch copy];
    _arrSketchOnText = [arrSketchOnText copy];
    [self setNeedsDisplay];
}

- (void)newPath:(int) pathId strokeColor:(UIColor*) strokeColor strokeWidth:(int) strokeWidth {
    _currentPath = [[RNSketchData alloc]
                    initWithId: pathId
                    strokeColor: strokeColor
                    strokeWidth: strokeWidth];
    [_paths addObject: _currentPath];
}

- (void) addPath:(int) pathId strokeColor:(UIColor*) strokeColor strokeWidth:(int) strokeWidth points:(NSArray*) points {
    bool exist = false;
    for(int i=0; i<_paths.count; i++) {
        if (((RNSketchData*)_paths[i]).pathId == pathId) {
            exist = true;
            break;
        }
    }
    
    if (!exist) {
        RNSketchData *data = [[RNSketchData alloc] initWithId: pathId
                                                  strokeColor: strokeColor
                                                  strokeWidth: strokeWidth
                                                       points: points];
        [_paths addObject: data];
        [data drawInContext:_drawingContext];
        [self setFrozenImageNeedsUpdate];
        [self setNeedsDisplay];
        [self notifyPathsUpdate];
    }
}

- (void)deletePath:(int) pathId {
    int index = -1;
    for(int i=0; i<_paths.count; i++) {
        if (((RNSketchData*)_paths[i]).pathId == pathId) {
            index = i;
            break;
        }
    }
    
    if (index > -1) {
        [_paths removeObjectAtIndex: index];
        _needsFullRedraw = YES;
        [self setNeedsDisplay];
        [self notifyPathsUpdate];
    }
}

- (void)addPointX: (float)x Y: (float)y {
    CGPoint newPoint = CGPointMake(x, y);
    CGRect updateRect = [_currentPath addPoint: newPoint];

    if (_currentPath.isTranslucent) {
        CGContextClearRect(_translucentDrawingContext, self.bounds);
        [_currentPath drawInContext:_translucentDrawingContext];
    } else {
        [_currentPath drawLastPointInContext:_drawingContext];
    }

    [self setFrozenImageNeedsUpdate];
    [self setNeedsDisplayInRect:updateRect];
}

- (void)endPath {
    if (_currentPath.isTranslucent) {
        [_currentPath drawInContext:_drawingContext];
    }
    _currentPath = nil;
}

- (void) clear {
    [_paths removeAllObjects];
    _currentPath = nil;
    _needsFullRedraw = YES;
    [self setNeedsDisplay];
    [self notifyPathsUpdate];
}

- (UIImage*)createImageWithTransparentBackground: (BOOL) transparent includeImage:(BOOL)includeImage includeText:(BOOL)includeText cropToImageSize:(BOOL)cropToImageSize {
    if (_backgroundImage && cropToImageSize) {
        CGRect rect = CGRectMake(0, 0, _backgroundImage.size.width, _backgroundImage.size.height);
        UIGraphicsBeginImageContextWithOptions(rect.size, !transparent, 1);
        CGContextRef context = UIGraphicsGetCurrentContext();
        if (!transparent) {
            CGContextSetRGBFillColor(context, 1.0f, 1.0f, 1.0f, 1.0f);
            CGContextFillRect(context, rect);
        }
        CGRect targetRect = [Utility fillImageWithSize:self.bounds.size toSize:rect.size contentMode:@"AspectFill"];
        if (includeImage) {
            [_backgroundImage drawInRect:rect];
        }
        
        if (includeText) {
            for (CanvasText *text in _arrSketchOnText) {
                @autoreleasepool {
                    [text.text drawInRect: text.drawRect withAttributes: text.attribute];
                }
            }
        }
        
        CGContextDrawImage(context, targetRect, _frozenImage);
        CGContextDrawImage(context, targetRect, _translucentFrozenImage);
        
        if (includeText) {
            @autoreleasepool {
                for (CanvasText *text in _arrTextOnSketch) {
                    [text.text drawInRect: text.drawRect withAttributes: text.attribute];
                }
            }
        }
        
        UIImage *img = UIGraphicsGetImageFromCurrentImageContext();
        UIGraphicsEndImageContext();
        
        return img;
    } else {
        CGRect rect = self.bounds;
        UIGraphicsBeginImageContextWithOptions(rect.size, !transparent, 0);
        CGContextRef context = UIGraphicsGetCurrentContext();
        if (!transparent) {
            CGContextSetRGBFillColor(context, 1.0f, 1.0f, 1.0f, 1.0f);
            CGContextFillRect(context, rect);
        }
        if (_backgroundImage && includeImage) {
            CGRect targetRect = [Utility fillImageWithSize:_backgroundImage.size toSize:rect.size contentMode:_backgroundImageContentMode];
            [_backgroundImage drawInRect:targetRect];
        }
        
        if (includeText) {
            for (CanvasText *text in _arrSketchOnText) {
                @autoreleasepool {
                    [text.text drawInRect: text.drawRect withAttributes: text.attribute];
                }
            }
        }
        
        CGContextDrawImage(context, rect, _frozenImage);
        CGContextDrawImage(context, rect, _translucentFrozenImage);
        
        if (includeText) {
            for (CanvasText *text in _arrTextOnSketch) {
                @autoreleasepool {
                    [text.text drawInRect: text.drawRect withAttributes: text.attribute];
                }
            }
        }
        
        UIImage *img = UIGraphicsGetImageFromCurrentImageContext();
        UIGraphicsEndImageContext();
        
        return img;
    }
}

- (void)saveImageOfType:(NSString*) type folder:(NSString*) folder filename:(NSString*) filename withTransparentBackground:(BOOL) transparent includeImage:(BOOL)includeImage includeText:(BOOL)includeText cropToImageSize:(BOOL)cropToImageSize {
    @autoreleasepool {
        UIImage *img = [self createImageWithTransparentBackground:transparent includeImage:includeImage includeText:(BOOL)includeText cropToImageSize:cropToImageSize];
        
        if (folder != nil && filename != nil) {
            NSURL *tempDir = [[NSURL fileURLWithPath:NSTemporaryDirectory() isDirectory:YES] URLByAppendingPathComponent: folder];
            NSError * error = nil;
            [[NSFileManager defaultManager] createDirectoryAtPath:[tempDir path]
                                    withIntermediateDirectories:YES
                                                    attributes:nil
                                                            error:&error];
            if (error == nil) {
                NSURL *fileURL = [[tempDir URLByAppendingPathComponent: filename] URLByAppendingPathExtension: type];
                NSData *imageData = [self getImageData:img type:type];
                [imageData writeToURL:fileURL atomically:YES];

                
                if ([self.eventDelegate respondsToSelector:@selector(handleEvent:)]) {
                    [self.eventDelegate handleEvent: @{ @"success": @YES, @"path": [fileURL path]}];
                }
                
            } else {
                if ([self.eventDelegate respondsToSelector:@selector(handleEvent:)]) {
                    [self.eventDelegate handleEvent: @{ @"success": @NO, @"path": [NSNull null]}];
                }
            }
            img = nil;
        } else {
            if ([type isEqualToString: @"png"]) {
                img = [UIImage imageWithData: UIImagePNGRepresentation(img)];
            }
            UIImageWriteToSavedPhotosAlbum(img, self, @selector(image:didFinishSavingWithError:contextInfo:), nil);
            img = nil;
        }
    }
}

- (UIImage *)scaleImage:(UIImage *)originalImage toSize:(CGSize)size contentMode:(NSString *)mode {
    UIGraphicsImageRendererFormat *format = [UIGraphicsImageRendererFormat defaultFormat];
    format.opaque = NO; // To handle transparency if needed
    format.scale = [UIScreen mainScreen].scale; // Use the screen scale to ensure high quality

    // Set the preferred range to automatic to allow the system to choose the best range for the device
    format.preferredRange = UIGraphicsImageRendererFormatRangeAutomatic;

    UIGraphicsImageRenderer *renderer = [[UIGraphicsImageRenderer alloc] initWithSize:size format:format];
    UIImage *scaledImage = [renderer imageWithActions:^(UIGraphicsImageRendererContext * _Nonnull rendererContext) {
        CGRect targetRect = [Utility fillImageWithSize:originalImage.size toSize:size contentMode:mode];
        [originalImage drawInRect:targetRect];
    }];

    return scaledImage;
}

- (NSString*) transferToBase64OfType: (NSString*) type withTransparentBackground: (BOOL) transparent includeImage:(BOOL)includeImage includeText:(BOOL)includeText cropToImageSize:(BOOL)cropToImageSize {
    UIImage *img = [self createImageWithTransparentBackground:transparent includeImage:includeImage includeText:(BOOL)includeText cropToImageSize:cropToImageSize];
    NSData *data = [self getImageData:img type:type];
    img = nil;
    return [data base64EncodedStringWithOptions: NSDataBase64Encoding64CharacterLineLength];
}

- (NSData*)getImageData:(UIImage*)img type:(NSString*) type {
    NSData *data;
    if ([type isEqualToString: @"jpg"]) {
        data = UIImageJPEGRepresentation(img, 1.0);
    } else {
        data = UIImagePNGRepresentation(img);
    }
    return data;
}

- (void)image:(UIImage *)image didFinishSavingWithError:(NSError *)error contextInfo: (void *) contextInfo {
    if ([self.eventDelegate respondsToSelector:@selector(handleEvent:)]) {
        [self.eventDelegate handleEvent: @{ @"success": error != nil ? @NO : @YES }];
    }
    
    if (image != NULL) {
        image = nil;
    }
    if (contextInfo != NULL) {
        contextInfo = nil;
    }
}

- (void)notifyPathsUpdate {
    if ([self.eventDelegate respondsToSelector:@selector(handleEvent:)]) {
        [self.eventDelegate handleEvent: @{
            @"eventType": @"pathsUpdate",
            @"pathsUpdate": @(_paths.count)
        }];
    }
}

- (BOOL)needsImageReload {
    return _backgroundImage == nil;
}

@end

@implementation CanvasText
@end
