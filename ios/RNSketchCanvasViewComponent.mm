#import "RNSketchCanvasViewComponent.h"
#import "RNSketchData.h"

#import <React/RCTConvert.h>

#import "generated/RNSketchCanvasSpec/ComponentDescriptors.h"
#import "generated/RNSketchCanvasSpec/EventEmitters.h"
#import "generated/RNSketchCanvasSpec/Props.h"
#import "generated/RNSketchCanvasSpec/RCTComponentViewHelpers.h"
#import "Utility.h"

#import "RCTFabricComponentsPlugins.h"
#import "React/RCTConversions.h"

using namespace facebook::react;

@interface RNTSketchCanvas () <RCTRNTSketchCanvasViewProtocol>

@end

@implementation RNTSketchCanvas {
    RNSketchCanvas * _view;
    NSMutableArray *_paths;
    RNSketchData *_currentPath;

    CGSize _lastSize;

    CGContextRef _drawingContext, _translucentDrawingContext;
    CGImageRef _frozenImage, _translucentFrozenImage;
    BOOL _needsFullRedraw;

    UIImage *_backgroundImage;
    UIImage *_backgroundImageScaled;
    NSString *_backgroundImageContentMode;
    
    NSArray *_arrTextOnSketch, *_arrSketchOnText;
}

+ (void)load
{
  [super load];
}

#pragma mark - RCTComponentViewProtocol

+ (ComponentDescriptorProvider)componentDescriptorProvider
{
    return concreteComponentDescriptorProvider<RNTSketchCanvasComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame
{
  if (self = [super initWithFrame:frame]) {
      static const auto defaultProps = std::make_shared<const RNTSketchCanvasProps>();
      _props = defaultProps;

      _paths = [NSMutableArray new];
      _needsFullRedraw = YES;

      _view = [[RNSketchCanvas alloc] init];

      self.contentView = _view;

      _view.eventDelegate = self;

      self.backgroundColor = [UIColor clearColor];
      [self setBackgroundColor: [UIColor clearColor]];
      self.clearsContextBeforeDrawing = YES;
  }

  return self;
}

- (void)dealloc {
    CGContextRelease(_drawingContext);
    _drawingContext = nil;
    CGContextRelease(_translucentDrawingContext);
    _translucentDrawingContext = nil;
    CGImageRelease(_frozenImage);
    _frozenImage = nil;
    CGImageRelease(_translucentFrozenImage);
    _translucentFrozenImage = nil;
    _backgroundImage = nil;
    _backgroundImageScaled = nil;
    
    _arrTextOnSketch = nil;
    _arrSketchOnText = nil;
    _paths = nil;
    _currentPath = nil;
}

#pragma mark - React API
-(void)updateLayoutMetrics:(const facebook::react::LayoutMetrics &)layoutMetrics oldLayoutMetrics:(const facebook::react::LayoutMetrics &)oldLayoutMetrics {
    [super updateLayoutMetrics:layoutMetrics oldLayoutMetrics:_layoutMetrics];
    _layoutMetrics = layoutMetrics;
}

-(void)prepareForRecycle {
    [super prepareForRecycle];
}

- (NSDictionary*)RNTSketchCanvasTextStructToDict:(const RNTSketchCanvasTextStruct&)txt {
    return @{
        @"text": RCTNSStringFromString(toString(txt.text)),
        @"font": RCTNSStringFromString(txt.font),
        @"fontSize": @(txt.fontSize),
        @"fontColor": @(txt.fontColor),
        @"overlay": RCTNSStringFromString(txt.overlay),
        @"anchor": @{
            @"x": @(txt.anchor.x),
            @"y": @(txt.anchor.y)
        },
        @"position": @{
            @"x": @(txt.position.x),
            @"y": @(txt.position.y)
        },
        @"coordinate": RCTNSStringFromString(txt.coordinate),
        @"alignment": RCTNSStringFromString(txt.alignment),
        @"lineHeightMultiple": @(txt.lineHeightMultiple)
    };
}

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps
{
    const auto &oldViewProps = *std::static_pointer_cast<RNTSketchCanvasProps const>(_props);
    const auto &newViewProps = *std::static_pointer_cast<RNTSketchCanvasProps const>(props);
    
     if (oldViewProps.text.size() != newViewProps.text.size()) {
         NSMutableArray *textArray = [NSMutableArray array];
         for (const auto& txt : newViewProps.text) {
             NSDictionary *textDict = [self RNTSketchCanvasTextStructToDict:txt];
             [textArray addObject:textDict];
         }
        [(RNSketchCanvas *)_view setCanvasText: textArray];
     } else {
         bool needsUpdate = false;
         for (size_t i = 0; i < oldViewProps.text.size(); i++) {
             const auto& oldTxt = oldViewProps.text[i];
             const auto& newTxt = newViewProps.text[i];
            
             if (oldTxt.text != newTxt.text ||
                 oldTxt.font != newTxt.font ||
                 oldTxt.fontSize != newTxt.fontSize ||
                 oldTxt.fontColor != newTxt.fontColor) {
                 needsUpdate = true;
                 break;
             }
         }
        
         if (needsUpdate) {
             NSMutableArray *textArray = [NSMutableArray array];
             for (const auto& txt : newViewProps.text) {
                 NSDictionary *textDict = [self RNTSketchCanvasTextStructToDict:txt];
                 [textArray addObject:textDict];
             }
            [(RNSketchCanvas *)_view setCanvasText: textArray];
         }
     }
    
    if (oldViewProps.localSourceImage.filename != newViewProps.localSourceImage.filename ||
        oldViewProps.localSourceImage.directory != newViewProps.localSourceImage.directory ||
        oldViewProps.localSourceImage.mode != newViewProps.localSourceImage.mode) {
        
        NSString *filename = [NSString stringWithUTF8String:newViewProps.localSourceImage.filename.c_str()];
        NSString *directory = [NSString stringWithUTF8String:newViewProps.localSourceImage.directory.c_str()];
        NSString *mode = [NSString stringWithUTF8String:newViewProps.localSourceImage.mode.c_str()];
        
        NSLog(@"openSketchFile: %@, %@, %@", filename, directory, mode);

        [(RNSketchCanvas *)_view openSketchFile:filename
                                      directory:directory
                                    contentMode:mode];
    }

    [super updateProps:props oldProps:oldProps];
}

#pragma mark - Sketch Native Event Emitters
- (void)handleEvent:(NSDictionary *)eventData {
  if ([eventData[@"eventType"] isEqualToString:@"pathsUpdate"]) {
    RNTSketchCanvasEventEmitter::OnChange result{
      .eventType = std::string([eventData[@"eventType"] UTF8String]),
      .pathsUpdate = [eventData[@"pathsUpdate"] intValue]
    };

    self.eventEmitter.onChange(result);
  } else {
    RNTSketchCanvasEventEmitter::OnChange result{
      .eventType = std::string("save"),
      .success = [eventData[@"success"] boolValue],
      .path = eventData[@"path"] ? std::string([eventData[@"path"] UTF8String]) : std::string()
    };

    self.eventEmitter.onChange(result);
  }
}

- (void)handleCommand:(const NSString *)commandName args:(const NSArray *)args {
   if ([commandName isEqualToString:@"addPoint"]) {
     [self addPoint: (NSArray *)args];
   } else if ([commandName isEqualToString:@"newPath"]) {
     [self newPath: (NSArray *)args];
   } else if ([commandName isEqualToString:@"addPath"]) {
     [self addPath: (NSArray *)args];
   } else if ([commandName isEqualToString:@"deletePath"]) {
     [self deletePath: [(NSNumber *)args[0] intValue]];
   } else if ([commandName isEqualToString:@"endPath"]) {
     [self endPath];
   } else if ([commandName isEqualToString:@"clear"]) {
     [self clear];
   } else if ([commandName isEqualToString:@"save"]) {
     [self save: (NSArray *)args];
   } else if ([commandName isEqualToString:@"transferToBase64"]) {
     [self transferToBase64: (NSArray *)args];
   }
}

#pragma mark - Internal methods

- (void)setCanvasText:(NSArray *)aText {
    [(RNSketchCanvas *)_view setCanvasText:aText];
}

- (void)newPath:(NSArray *)args {
    int pathId = [(NSNumber *)args[0] intValue];
    UIColor *strokeColor = [RCTConvert UIColor:args[1]];
    int strokeWidth = [(NSNumber *)args[2] intValue];
    
    [(RNSketchCanvas *)_view newPath:pathId 
                        strokeColor:strokeColor 
                        strokeWidth:strokeWidth];
}

- (void) addPath:(NSArray *)args {
    int pathId = [(NSNumber *)args[0] intValue];
    UIColor *strokeColor = [RCTConvert UIColor:args[1]];
    int strokeWidth = [(NSNumber *)args[2] intValue];
    NSArray *points = (NSArray *)args[3];

    NSMutableArray *cgPoints = [[NSMutableArray alloc] initWithCapacity:points.count];
            
    for (NSString *coor in points) {
        @autoreleasepool {
            NSArray *coorInNumber = [coor componentsSeparatedByString:@","];
            CGPoint point = CGPointMake([coorInNumber[0] floatValue], [coorInNumber[1] floatValue]);
            [cgPoints addObject:[NSValue valueWithCGPoint:point]];
        }
    }
    
    [(RNSketchCanvas *)_view addPath:pathId
                         strokeColor:strokeColor
                         strokeWidth:strokeWidth
                              points:cgPoints];
}

- (void)deletePath:(int) pathId {
    [(RNSketchCanvas *)_view deletePath:pathId];
}

- (void)addPoint: (NSArray *)args {
    float x = [(NSNumber *)args[0] floatValue];
    float y = [(NSNumber *)args[1] floatValue];
    
    [(RNSketchCanvas *)_view addPointX:x Y:y];
}

- (void)endPath {
    [(RNSketchCanvas *)_view endPath];
}

- (void) clear {
    [(RNSketchCanvas *)_view clear];
}

- (void)save: (NSArray *)args {
    NSString *type = (NSString *)args[0];
    NSString *folder = (NSString *)args[1];
    NSString *filename = (NSString *)args[2];
    BOOL transparent = [(NSNumber *)args[3] boolValue];
    BOOL includeImage = [(NSNumber *)args[4] boolValue];
    BOOL includeText = [(NSNumber *)args[5] boolValue];
    BOOL cropToImageSize = [(NSNumber *)args[6] boolValue];

    [(RNSketchCanvas *)_view saveImageOfType:type 
                                      folder:folder
                                    filename:filename
                   withTransparentBackground:transparent
                                includeImage:includeImage
                                 includeText:includeText 
                             cropToImageSize:cropToImageSize];
}

- (void) transferToBase64: (NSArray *)args {
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
    RNTSketchCanvasEventEmitter::OnChange result{
        .success = error != nil
    };
    
    self.eventEmitter.onChange(result);
    
    if (image != NULL) {
        image = nil;
    }
    if (contextInfo != NULL) {
        contextInfo = nil;
    }
}

-(NSDictionary *)constantsToExport {
    return @{
        @"MainBundlePath": [[NSBundle mainBundle] bundlePath],
        @"NSDocumentDirectory": [NSSearchPathForDirectoriesInDomains(NSDocumentDirectory, NSUserDomainMask, YES) firstObject],
        @"NSLibraryDirectory": [NSSearchPathForDirectoriesInDomains(NSLibraryDirectory, NSUserDomainMask, YES) firstObject],
        @"NSCachesDirectory": [NSSearchPathForDirectoriesInDomains(NSCachesDirectory, NSUserDomainMask, YES) firstObject],
    };
}

- (NSDictionary*) getConstants {
  return [self constantsToExport];
}

- (const RNTSketchCanvasEventEmitter &)eventEmitter
{
  return static_cast<const RNTSketchCanvasEventEmitter &>(*_eventEmitter);
}

Class<RCTComponentViewProtocol> RNTSketchCanvasCls(void)
{
    return RNTSketchCanvas.class;
}
@end
