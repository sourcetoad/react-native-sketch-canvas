import UIKit

func midPoint(_ p1: CGPoint, _ p2: CGPoint) -> CGPoint {
  CGPoint(x: (p1.x + p2.x) * 0.5, y: (p1.y + p2.y) * 0.5)
}

@MainActor
enum Utility {
  static func addPointToPath(
    _ path: UIBezierPath?,
    toPoint point: CGPoint,
    tertiaryPoint tPoint: CGPoint,
    previousPoint pPoint: CGPoint
  ) {
    let mid1 = midPoint(pPoint, tPoint)
    let mid2 = midPoint(point, pPoint)
    path?.move(to: mid1)
    path?.addQuadCurve(to: mid2, controlPoint: pPoint)
  }

  static func isSameColor(_ color1: UIColor, _ color2: UIColor) -> Bool {
    var red1: CGFloat = 0, green1: CGFloat = 0, blue1: CGFloat = 0, alpha1: CGFloat = 0
    color1.getRed(&red1, green: &green1, blue: &blue1, alpha: &alpha1)
    var red2: CGFloat = 0, green2: CGFloat = 0, blue2: CGFloat = 0, alpha2: CGFloat = 0
    color2.getRed(&red2, green: &green2, blue: &blue2, alpha: &alpha2)
    return red1 == red2 && green1 == green2 && blue1 == blue2 && alpha1 == alpha2
  }

  static func fillImageWithSize(
    _ imgSize: CGSize,
    toSize targetSize: CGSize,
    contentMode mode: String?
  ) -> CGRect {
    let imageAspectRatio = imgSize.width / imgSize.height
    let targetAspectRatio = targetSize.width / targetSize.height
    switch mode {
    case "AspectFill":
      let scaleFactor =
        targetAspectRatio < imageAspectRatio
        ? targetSize.height / imgSize.height : targetSize.width / imgSize.width
      let w = imgSize.width * scaleFactor
      let h = imgSize.height * scaleFactor
      return CGRect(x: (targetSize.width - w) / 2, y: (targetSize.height - h) / 2, width: w, height: h)
    case "ScaleToFill":
      return CGRect(x: 0, y: 0, width: targetSize.width, height: targetSize.height)
    default:
      let scaleFactor =
        targetAspectRatio > imageAspectRatio
        ? targetSize.height / imgSize.height : targetSize.width / imgSize.width
      let w = imgSize.width * scaleFactor
      let h = imgSize.height * scaleFactor
      return CGRect(x: (targetSize.width - w) / 2, y: (targetSize.height - h) / 2, width: w, height: h)
    }
  }
}
