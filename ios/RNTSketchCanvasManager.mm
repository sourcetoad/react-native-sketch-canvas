#import "RNTSketchCanvasManager.h"

@implementation RNTSketchCanvasManager
RCT_EXPORT_MODULE()

- (NSNumber *)multiply:(double)a b:(double)b {
    NSNumber *result = @(a * b);

    return result;
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
    return std::make_shared<facebook::react::NativeSketchCanvasModuleSpecJSI>(params);
}

-(NSDictionary *) constantsToExport {
    return @{
        @"MainBundlePath": [[NSBundle mainBundle] bundlePath],
        @"NSDocumentDirectory": [NSSearchPathForDirectoriesInDomains(NSDocumentDirectory, NSUserDomainMask, YES) firstObject],
        @"NSLibraryDirectory": [NSSearchPathForDirectoriesInDomains(NSLibraryDirectory, NSUserDomainMask, YES) firstObject],
        @"NSCachesDirectory": [NSSearchPathForDirectoriesInDomains(NSCachesDirectory, NSUserDomainMask, YES) firstObject],
    };
}

- (NSDictionary *)getConstants {
    return [self constantsToExport];
}

@end
