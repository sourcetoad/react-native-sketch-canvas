import UIKit

struct CanvasTextInput: Equatable {
  var text: String
  var font: String
  var fontSize: Double
  var fontColor: UInt32
  var overlay: String
  var anchor: CGPoint
  var position: CGPoint
  var coordinate: String
  var alignment: String
  var lineHeightMultiple: Double
}

@MainActor
final class CanvasText {
  var text: String = ""
  var font: UIFont = .systemFont(ofSize: 12)
  var fontColor: UIColor = .black
  var anchor: CGPoint = .zero
  var position: CGPoint = .zero
  var attribute: [NSAttributedString.Key: Any] = [:]
  var isAbsoluteCoordinate = false
  var drawRect: CGRect = .zero

  func draw() {
    (text as NSString).draw(in: drawRect, withAttributes: attribute)
  }
}
