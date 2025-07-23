#import <UIKit/UIKit.h>

@class RNSketchData;

@protocol RNSketchCanvasEventDelegate <NSObject>
- (void)handleEvent:(NSDictionary *)eventData;
@end

@interface RNSketchCanvas : UIView

@property (nonatomic, weak) id<RNSketchCanvasEventDelegate> eventDelegate;
- (BOOL)openSketchFile:(NSString *)filename directory:(NSString*) directory contentMode:(NSString*)mode;
- (void)setCanvasText:(NSArray *)text;
- (void)newPath:(int) pathId strokeColor:(UIColor*) strokeColor strokeWidth:(int) strokeWidth;
- (void)addPath:(int) pathId strokeColor:(UIColor*) strokeColor strokeWidth:(int) strokeWidth points:(NSArray*) points;
- (void)addPaths:(NSArray<RNSketchData *> *) pathsToAdd;
- (void)deletePath:(int) pathId;
- (void)addPointX: (float)x Y: (float)y;
- (void)endPath;
- (void)clear;
- (void)saveImageOfType:(NSString*) type folder:(NSString*) folder filename:(NSString*) filename withTransparentBackground:(BOOL) transparent includeImage:(BOOL)includeImage includeText:(BOOL)includeText cropToImageSize:(BOOL)cropToImageSize;
- (NSString*) transferToBase64OfType: (NSString*) type withTransparentBackground: (BOOL) transparent includeImage:(BOOL)includeImage includeText:(BOOL)includeText cropToImageSize:(BOOL)cropToImageSize;
- (void)invalidate;
- (BOOL)needsImageReload;

@end


@interface CanvasText : NSObject

@property (nonatomic) NSString *text;
@property (nonatomic) UIFont *font;
@property (nonatomic) UIColor *fontColor;
@property (nonatomic) CGPoint anchor, position;
@property (nonatomic) NSDictionary *attribute;
@property (nonatomic) BOOL isAbsoluteCoordinate;
@property (nonatomic) CGRect drawRect;

@end
