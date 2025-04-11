#import <React/RCTViewManager.h>
#import <React/RCTUIManager.h>
#import "RCTBridge.h"

@interface RNSketchCanvasViewManager : RCTViewManager
@end

@implementation RNSketchCanvasViewManager

RCT_EXPORT_MODULE(RNTSketchCanvas)

- (UIView *)view
{
  return [[UIView alloc] init];
}

RCT_EXPORT_VIEW_PROPERTY(localSourceImage, NSDictionary)
RCT_EXPORT_VIEW_PROPERTY(text, NSArray)
RCT_EXPORT_VIEW_PROPERTY(onChange, RCTBubblingEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onGenerateBase64, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onCanvasReady, RCTDirectEventBlock)

@end
