#import "RNSketchCanvasViewComponent.h"
#import "RNSketchData.h"

#import <React/RCTConvert.h>

#import "react/renderer/components/RNSketchCanvasSpec/ComponentDescriptors.h"
#import "react/renderer/components/RNSketchCanvasSpec/EventEmitters.h"
#import "react/renderer/components/RNSketchCanvasSpec/Props.h"
#import "react/renderer/components/RNSketchCanvasSpec/RCTComponentViewHelpers.h"
#import "Utility.h"

#import "RCTFabricComponentsPlugins.h"
#import "React/RCTConversions.h"

using namespace facebook::react;

@interface RNTSketchCanvas () <RCTRNTSketchCanvasViewProtocol>

@end

@implementation RNTSketchCanvas {
    RNSketchCanvas * _view;
    BOOL _isInitialValueSet;
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

- (void)setupView {
    _view = [[RNSketchCanvas alloc] init];
    self.contentView = _view;
    _view.eventDelegate = self;
}

- (instancetype)initWithFrame:(CGRect)frame
{
  if (self = [super initWithFrame:frame]) {
      static const auto defaultProps = std::make_shared<const RNTSketchCanvasProps>();
      _props = defaultProps;
      [self setupView];
  }
  return self;
}

#pragma mark - React API
-(void)updateLayoutMetrics:(const facebook::react::LayoutMetrics &)layoutMetrics oldLayoutMetrics:(const facebook::react::LayoutMetrics &)oldLayoutMetrics {
    [super updateLayoutMetrics:layoutMetrics oldLayoutMetrics:_layoutMetrics];
    _layoutMetrics = layoutMetrics;
}

-(void)prepareForRecycle {
    [super prepareForRecycle];
  
    if (_view) {
        [(RNSketchCanvas *)_view invalidate];
        [_view removeFromSuperview];

        [self setupView];
    }
  
  
    _isInitialValueSet = NO;
}

- (NSDictionary*)RNTSketchCanvasTextStructToDict:(const RNTSketchCanvasTextStruct&)txt {
    return @{
        @"text": RCTNSStringFromString(txt.text),
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
    
     if (!_isInitialValueSet || oldViewProps.text.size() != newViewProps.text.size()) {
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
    
    // Check if we need to load/reload the image
    bool shouldLoadImage = oldViewProps.localSourceImage.filename != newViewProps.localSourceImage.filename ||
                         oldViewProps.localSourceImage.directory != newViewProps.localSourceImage.directory ||
                         oldViewProps.localSourceImage.mode != newViewProps.localSourceImage.mode;
    
    // Also reload if the view was recently invalidated (background image is nil)
    if (shouldLoadImage || [(RNSketchCanvas *)_view needsImageReload]) {
        NSString *filename = [NSString stringWithUTF8String:newViewProps.localSourceImage.filename.c_str()];
        NSString *directory = [NSString stringWithUTF8String:newViewProps.localSourceImage.directory.c_str()];
        NSString *mode = [NSString stringWithUTF8String:newViewProps.localSourceImage.mode.c_str()];
        
        // Only proceed if we have a valid filename
        if (filename.length > 0) {
            [(RNSketchCanvas *)_view openSketchFile:filename
                                        directory:directory
                                      contentMode:mode];
        }
    }
  
    _isInitialValueSet = YES;

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
  } else if ([eventData[@"eventType"] isEqualToString:@"onCanvasReady"]) {
    RNTSketchCanvasEventEmitter::OnCanvasReady result{};

    self.eventEmitter.onCanvasReady(result);
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
   } else if ([commandName isEqualToString:@"addInitialPaths"]) {
     [self addInitialPaths: (NSArray *)args];
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

- (void)addInitialPaths:(NSArray *)args {
    NSArray *pathsArray = (NSArray *)args[0];
    
    if (!pathsArray || ![pathsArray isKindOfClass:[NSArray class]]) {
        // Emit event with 0 loaded count for empty/invalid arrays
        RNTSketchCanvasEventEmitter::OnInitialPathsLoaded result{
            .loadedCount = 0
        };
        self.eventEmitter.onInitialPathsLoaded(result);
        return;
    }
    
    NSDate *startTime = [NSDate date];
    
    NSMutableArray *validPaths = [NSMutableArray new];
    
    for (NSDictionary *pathData in pathsArray) {
        @autoreleasepool {
            if (![pathData isKindOfClass:[NSDictionary class]]) {
                continue;
            }
            
            NSNumber *pathIdNumber = pathData[@"pathId"];
            NSNumber *colorNumber = pathData[@"color"];
            NSNumber *widthNumber = pathData[@"width"];
            NSArray *points = pathData[@"points"];
            
            if (!pathIdNumber || !colorNumber || !widthNumber || !points) {
                continue;
            }
            
            int pathId = [pathIdNumber intValue];
            UIColor *strokeColor = [RCTConvert UIColor:colorNumber];
            int strokeWidth = [widthNumber intValue];
            
            if (![points isKindOfClass:[NSArray class]]) {
                continue;
            }
            
            NSMutableArray *cgPoints = [[NSMutableArray alloc] initWithCapacity:points.count];
            
            for (NSString *coor in points) {
                if (![coor isKindOfClass:[NSString class]]) {
                    continue;
                }
                
                NSArray *coorInNumber = [coor componentsSeparatedByString:@","];
                if (coorInNumber.count >= 2) {
                    CGPoint point = CGPointMake([coorInNumber[0] floatValue], [coorInNumber[1] floatValue]);
                    [cgPoints addObject:[NSValue valueWithCGPoint:point]];
                }
            }
            
            if (cgPoints.count > 0) {
                RNSketchData *data = [[RNSketchData alloc] initWithId:pathId
                                                          strokeColor:strokeColor
                                                          strokeWidth:strokeWidth
                                                               points:cgPoints];
                [validPaths addObject:data];
            }
        }
    }
    
    NSTimeInterval parsingTime = [[NSDate date] timeIntervalSinceDate:startTime] * 1000.0;
    
    // Performance optimization: Use batch method instead of individual addPath calls
    [(RNSketchCanvas *)_view addPaths:validPaths];
    
    
    // Emit onInitialPathsLoaded event with the count of successfully loaded paths
    RNTSketchCanvasEventEmitter::OnInitialPathsLoaded result{
        .loadedCount = (int)validPaths.count
    };
    self.eventEmitter.onInitialPathsLoaded(result);
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
    NSString *type = (NSString *)args[0];
    BOOL transparent = [(NSNumber *)args[1] boolValue];
    BOOL includeImage = [(NSNumber *)args[2] boolValue];
    BOOL includeText = [(NSNumber *)args[3] boolValue];
    BOOL cropToImageSize = [(NSNumber *)args[4] boolValue];

    NSString *base64 = [(RNSketchCanvas *)_view transferToBase64OfType:type
                                                    withTransparentBackground:transparent
                                                                 includeImage:includeImage
                                                                  includeText:includeText
                                                              cropToImageSize:cropToImageSize];
    RNTSketchCanvasEventEmitter::OnGenerateBase64 result{
        .base64 = std::string([base64 UTF8String])
    };
    
    self.eventEmitter.onGenerateBase64(result);
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
