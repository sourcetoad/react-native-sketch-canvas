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

@end
