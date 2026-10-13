import UIKit

@MainActor
final class SketchData {
  let pathId: Int32
  let strokeWidth: CGFloat
  let strokeColor: UIColor
  private(set) var points: [CGPoint]
  let isTranslucent: Bool

  private var dirty: CGRect = .zero
  private var path: UIBezierPath?

  init(id pathId: Int32, strokeColor: UIColor, strokeWidth: Int) {
    self.pathId = pathId
    self.strokeColor = strokeColor
    self.strokeWidth = CGFloat(strokeWidth)
    self.points = []
    self.isTranslucent = Self.isTranslucentColor(strokeColor)
    self.path = isTranslucent ? UIBezierPath() : nil
  }

  init(id pathId: Int32, strokeColor: UIColor, strokeWidth: Int, points: [CGPoint]) {
    self.pathId = pathId
    self.strokeColor = strokeColor
    self.strokeWidth = CGFloat(strokeWidth)
    self.points = points
    self.isTranslucent = Self.isTranslucentColor(strokeColor)
    self.path = isTranslucent ? evaluatePath() : nil
  }

  private static func isTranslucentColor(_ color: UIColor) -> Bool {
    color.cgColor.alpha != 1.0 && !Utility.isSameColor(color, .clear)
  }

  func addPoint(_ point: CGPoint) -> CGRect {
    points.append(point)

    var updateRect: CGRect
    let pointsCount = points.count

    if isTranslucent {
      if pointsCount >= 3 {
        Utility.addPointToPath(
          path,
          toPoint: point,
          tertiaryPoint: points[pointsCount - 3],
          previousPoint: points[pointsCount - 2]
        )
      } else if pointsCount >= 2 {
        Utility.addPointToPath(
          path,
          toPoint: point,
          tertiaryPoint: points[0],
          previousPoint: points[0]
        )
      } else {
        Utility.addPointToPath(path, toPoint: point, tertiaryPoint: point, previousPoint: point)
      }

      let pointRect = CGRect(x: point.x, y: point.y, width: 1, height: 1)
      dirty = dirty.isEmpty ? pointRect : dirty.union(pointRect)
      updateRect = dirty.insetBy(dx: -strokeWidth * 2, dy: -strokeWidth * 2)
    } else {
      if pointsCount >= 3 {
        let a = points[pointsCount - 3]
        let b = points[pointsCount - 2]
        let c = point
        let prevMid = midPoint(a, b)
        let currentMid = midPoint(b, c)

        updateRect = CGRect(x: prevMid.x, y: prevMid.y, width: 0, height: 0)
        updateRect = updateRect.union(CGRect(x: b.x, y: b.y, width: 0, height: 0))
        updateRect = updateRect.union(CGRect(x: currentMid.x, y: currentMid.y, width: 0, height: 0))
      } else if pointsCount >= 2 {
        let a = points[pointsCount - 2]
        let b = point
        let mid = midPoint(a, b)

        updateRect = CGRect(x: a.x, y: a.y, width: 0, height: 0)
        updateRect = updateRect.union(CGRect(x: mid.x, y: mid.y, width: 0, height: 0))
      } else {
        updateRect = CGRect(x: point.x, y: point.y, width: 0, height: 0)
      }

      updateRect = updateRect.insetBy(dx: -strokeWidth * 2, dy: -strokeWidth * 2)
    }

    return updateRect
  }

  func drawLastPoint(in context: CGContext?) {
    let pointsCount = points.count
    if pointsCount < 1 {
      return
    }

    draw(in: context, pointIndex: pointsCount - 1)
  }

  func draw(in context: CGContext?) {
    if isTranslucent {
      guard let context else { return }
      context.setLineWidth(strokeWidth)
      context.setLineCap(.round)
      context.setLineJoin(.round)
      context.setStrokeColor(strokeColor.cgColor)
      context.setBlendMode(.normal)

      if let cgPath = path?.cgPath {
        context.addPath(cgPath)
      }
      context.strokePath()
    } else {
      for i in 0..<points.count {
        autoreleasepool {
          draw(in: context, pointIndex: i)
        }
      }
    }
  }

  private func draw(in context: CGContext?, pointIndex: Int) {
    let pointsCount = points.count
    if pointIndex >= pointsCount {
      return
    }
    guard let context else { return }

    let isErase = Utility.isSameColor(strokeColor, .clear)

    context.setStrokeColor(strokeColor.cgColor)
    context.setLineWidth(strokeWidth)
    context.setLineCap(.round)
    context.setLineJoin(.round)
    context.setBlendMode(isErase ? .clear : .normal)
    context.beginPath()

    if pointsCount >= 3 && pointIndex >= 2 {
      let a = points[pointIndex - 2]
      let b = points[pointIndex - 1]
      let c = points[pointIndex]
      let prevMid = midPoint(a, b)
      let currentMid = midPoint(b, c)

      context.move(to: prevMid)
      context.addQuadCurve(to: currentMid, control: b)
    } else if pointsCount >= 2 && pointIndex >= 1 {
      let a = points[pointIndex - 1]
      let b = points[pointIndex]
      let mid = midPoint(a, b)

      context.move(to: a)
      context.addLine(to: mid)
    } else if pointsCount >= 1 {
      let a = points[pointIndex]

      context.move(to: a)
      context.addLine(to: a)
    }

    context.strokePath()
  }

  private func evaluatePath() -> UIBezierPath {
    let pointsCount = points.count
    let path = UIBezierPath()

    for pointIndex in 0..<pointsCount {
      if pointsCount >= 3 && pointIndex >= 2 {
        let a = points[pointIndex - 2]
        let b = points[pointIndex - 1]
        let c = points[pointIndex]
        let prevMid = midPoint(a, b)
        let currentMid = midPoint(b, c)

        path.move(to: prevMid)
        path.addQuadCurve(to: currentMid, controlPoint: b)
      } else if pointsCount >= 2 && pointIndex >= 1 {
        let a = points[pointIndex - 1]
        let b = points[pointIndex]
        let mid = midPoint(a, b)

        path.move(to: a)
        path.addLine(to: mid)
      } else if pointsCount >= 1 {
        let a = points[pointIndex]

        path.move(to: a)
        path.addLine(to: a)
      }
    }
    return path
  }
}
