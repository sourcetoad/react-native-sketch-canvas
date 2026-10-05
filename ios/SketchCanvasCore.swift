import UIKit

@MainActor
final class SketchCanvasCore: UIView {
  var onCanvasReady: (() -> Void)?
  var onPathsChange: ((Int) -> Void)?

  private var paths: [SketchData] = []
  private var pathIds = Set<Int32>()
  private var currentPath: SketchData?

  private var lastSize: CGSize = .zero

  private var drawingContext: CGContext?
  private var translucentDrawingContext: CGContext?
  private var frozenImage: CGImage?
  private var translucentFrozenImage: CGImage?
  private var needsFullRedraw = true
  private var canvasIsReady = false

  private var backgroundImage: UIImage?
  private var backgroundImageScaled: UIImage?
  private var backgroundImageContentMode: String?

  private var arrTextOnSketch: [CanvasText] = []
  private var arrSketchOnText: [CanvasText] = []

  override init(frame: CGRect) {
    super.init(frame: frame)
    backgroundColor = .clear
    clearsContextBeforeDrawing = true
  }

  required init?(coder: NSCoder) {
    nil
  }

  func invalidate() {
    drawingContext = nil
    translucentDrawingContext = nil
    frozenImage = nil
    translucentFrozenImage = nil

    backgroundImage = nil
    backgroundImageScaled = nil
    backgroundImageContentMode = nil

    arrTextOnSketch = []
    arrSketchOnText = []
    paths.removeAll()
    pathIds.removeAll()
    currentPath = nil
    lastSize = .zero
    canvasIsReady = false
    needsFullRedraw = true
  }

  override func draw(_ rect: CGRect) {
    let context = UIGraphicsGetCurrentContext()

    let bounds = self.bounds

    if needsFullRedraw {
      setFrozenImageNeedsUpdate()
      drawingContext?.clear(bounds)
      for path in paths {
        autoreleasepool {
          path.draw(in: drawingContext)
        }
      }
      needsFullRedraw = false
    }

    if frozenImage == nil {
      frozenImage = drawingContext?.makeImage()
    }

    if translucentFrozenImage == nil && currentPath?.isTranslucent == true {
      translucentFrozenImage = translucentDrawingContext?.makeImage()
    }

    if let backgroundImage {
      if backgroundImageScaled == nil {
        backgroundImageScaled = scaleImage(
          backgroundImage,
          toSize: bounds.size,
          contentMode: backgroundImageContentMode
        )
      }

      backgroundImageScaled?.draw(in: bounds)
    }

    for text in arrSketchOnText {
      autoreleasepool {
        text.draw()
      }
    }

    if let frozenImage {
      context?.draw(frozenImage, in: bounds)
    }

    if let translucentFrozenImage, currentPath?.isTranslucent == true {
      context?.draw(translucentFrozenImage, in: bounds)
    }

    for text in arrTextOnSketch {
      autoreleasepool {
        text.draw()
      }
    }
  }

  override func layoutSubviews() {
    super.layoutSubviews()

    if bounds.size != lastSize {
      lastSize = bounds.size
      drawingContext = nil
      translucentDrawingContext = nil
      createDrawingContext()
      needsFullRedraw = true
      backgroundImageScaled = nil

      for text in arrTextOnSketch + arrSketchOnText {
        autoreleasepool {
          var position = text.position
          if !text.isAbsoluteCoordinate {
            position.x *= bounds.size.width
            position.y *= bounds.size.height
          }
          position.x -= text.drawRect.size.width * text.anchor.x
          position.y -= text.drawRect.size.height * text.anchor.y
          text.drawRect = CGRect(
            x: position.x,
            y: position.y,
            width: text.drawRect.size.width,
            height: text.drawRect.size.height
          )
        }
      }

      setNeedsDisplay()
    } else if drawingContext == nil || translucentDrawingContext == nil {
      createDrawingContext()
      needsFullRedraw = true
      setNeedsDisplay()
    }
  }

  private func createDrawingContext() {
    guard let window else {
      DispatchQueue.main.async {
        if self.window != nil {
          self.createDrawingContext()
        }
      }
      return
    }

    let scale = window.screen.scale
    var size = bounds.size

    if size.width == 0 || size.height == 0 {
      return
    }

    size.width *= scale
    size.height *= scale

    if drawingContext != nil {
      drawingContext = nil
      canvasIsReady = false
    }
    if translucentDrawingContext != nil {
      translucentDrawingContext = nil
      canvasIsReady = false
    }

    let colorSpace = CGColorSpaceCreateDeviceRGB()

    drawingContext = Self.makeBitmapContext(size: size, colorSpace: colorSpace)
    translucentDrawingContext = Self.makeBitmapContext(size: size, colorSpace: colorSpace)

    if let drawingContext, let translucentDrawingContext {
      drawingContext.concatenate(CGAffineTransform(scaleX: scale, y: scale))
      translucentDrawingContext.concatenate(CGAffineTransform(scaleX: scale, y: scale))

      if !canvasIsReady {
        onCanvasReady?()
        canvasIsReady = true
      }
    } else {
      NSLog("Failed to create bitmap contexts")
      drawingContext = nil
      translucentDrawingContext = nil
      canvasIsReady = false
    }
  }

  private static func makeBitmapContext(size: CGSize, colorSpace: CGColorSpace) -> CGContext? {
    CGContext(
      data: nil,
      width: Int(size.width),
      height: Int(size.height),
      bitsPerComponent: 8,
      bytesPerRow: 0,
      space: colorSpace,
      bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
    )
  }

  override func didMoveToWindow() {
    super.didMoveToWindow()

    if window != nil && (drawingContext == nil || translucentDrawingContext == nil) {
      createDrawingContext()
      needsFullRedraw = true
      setNeedsDisplay()
    }
  }

  private func setFrozenImageNeedsUpdate() {
    frozenImage = nil
    translucentFrozenImage = nil
  }

  private func ensureFrozenImagesUpToDate() {
    if drawingContext == nil || translucentDrawingContext == nil {
      createDrawingContext()
    }
    if frozenImage == nil, let drawingContext {
      frozenImage = drawingContext.makeImage()
    }
    if let currentPath, currentPath.isTranslucent,
      translucentFrozenImage == nil, let translucentDrawingContext
    {
      translucentFrozenImage = translucentDrawingContext.makeImage()
    }
  }

  @discardableResult
  func openSketchFile(_ filename: String, directory: String, contentMode mode: String) -> Bool {
    var success = false
    autoreleasepool {
      var image = UIImage(contentsOfFile: (directory as NSString).appendingPathComponent(filename))
      image = image ?? UIImage(named: filename)
      if let loadedImage = image {
        if loadedImage.imageOrientation != .up {
          UIGraphicsBeginImageContextWithOptions(loadedImage.size, false, loadedImage.scale)
          loadedImage.draw(in: CGRect(origin: .zero, size: loadedImage.size))
          image = UIGraphicsGetImageFromCurrentImageContext()
          UIGraphicsEndImageContext()
        }
        backgroundImage = image
        backgroundImageScaled = nil
        backgroundImageContentMode = mode
        setNeedsDisplay()

        success = true
      }
    }
    return success
  }

  func setCanvasText(_ aText: [CanvasTextInput]) {
    var arrTextOnSketch: [CanvasText] = []
    var arrSketchOnText: [CanvasText] = []

    for property in aText {
      autoreleasepool {
        let text = CanvasText()
        text.text = property.text
        let fontSize = CGFloat(Float(property.fontSize))
        let font = UIFont(name: property.font, size: fontSize) ?? .systemFont(ofSize: fontSize)
        text.font = font
        text.anchor = Self.floatPoint(property.anchor)
        text.position = Self.floatPoint(property.position)
        let color = property.fontColor
        let fontColor = UIColor(
          red: CGFloat((color & 0x00FF_0000) >> 16) / 0xFF,
          green: CGFloat((color & 0x0000_FF00) >> 8) / 0xFF,
          blue: CGFloat(color & 0x0000_00FF) / 0xFF,
          alpha: CGFloat((color & 0xFF00_0000) >> 24) / 0xFF
        )
        text.fontColor = fontColor
        let style = NSParagraphStyle.default.mutableCopy() as! NSMutableParagraphStyle
        style.alignment = Self.textAlignment(property.alignment)
        style.lineHeightMultiple = CGFloat(Float(property.lineHeightMultiple))
        text.attribute = [
          .font: font,
          .foregroundColor: fontColor,
          .paragraphStyle: style,
        ]
        text.isAbsoluteCoordinate = property.coordinate != "Ratio"
        let textSize = (text.text as NSString).size(withAttributes: text.attribute)

        var position = text.position
        if !text.isAbsoluteCoordinate {
          position.x *= bounds.size.width
          position.y *= bounds.size.height
        }
        position.x -= textSize.width * text.anchor.x
        position.y -= textSize.height * text.anchor.y
        text.drawRect = CGRect(x: position.x, y: position.y, width: textSize.width, height: textSize.height)
        if property.overlay == "TextOnSketch" {
          arrTextOnSketch.append(text)
        } else {
          arrSketchOnText.append(text)
        }
      }
    }
    self.arrTextOnSketch = arrTextOnSketch
    self.arrSketchOnText = arrSketchOnText
    setNeedsDisplay()
  }

  private static func floatPoint(_ point: CGPoint) -> CGPoint {
    CGPoint(x: CGFloat(Float(point.x)), y: CGFloat(Float(point.y)))
  }

  private static func textAlignment(_ alignment: String) -> NSTextAlignment {
    switch alignment {
    case "Center": return .center
    case "Right": return .right
    default: return .left
    }
  }

  func newPath(_ pathId: Int32, strokeColor: UIColor, strokeWidth: Int) {
    let path = SketchData(id: pathId, strokeColor: strokeColor, strokeWidth: strokeWidth)
    currentPath = path
    paths.append(path)
    pathIds.insert(pathId)
  }

  func addPath(_ pathId: Int32, strokeColor: UIColor, strokeWidth: Int, points: [CGPoint]) {
    if !pathIds.contains(pathId) {
      let data = SketchData(id: pathId, strokeColor: strokeColor, strokeWidth: strokeWidth, points: points)
      paths.append(data)
      pathIds.insert(pathId)
      data.draw(in: drawingContext)
      setFrozenImageNeedsUpdate()
      setNeedsDisplay()
      notifyPathsUpdate()
    }
  }

  func addPaths(_ pathsToAdd: [SketchData]) {
    if pathsToAdd.isEmpty {
      return
    }

    var validPaths: [SketchData] = []

    for data in pathsToAdd {
      if !pathIds.contains(data.pathId) {
        validPaths.append(data)
        pathIds.insert(data.pathId)
      }
    }

    if !validPaths.isEmpty {
      paths.append(contentsOf: validPaths)

      needsFullRedraw = true
      setNeedsDisplay()
      notifyPathsUpdate()
    }
  }

  func deletePath(_ pathId: Int32) {
    if let index = paths.firstIndex(where: { $0.pathId == pathId }) {
      paths.remove(at: index)
      pathIds.remove(pathId)
      needsFullRedraw = true
      setNeedsDisplay()
      notifyPathsUpdate()
    }
  }

  func addPoint(x: Float, y: Float) {
    let newPoint = CGPoint(x: CGFloat(x), y: CGFloat(y))
    let updateRect = currentPath?.addPoint(newPoint) ?? .zero

    if currentPath?.isTranslucent == true {
      translucentDrawingContext?.clear(bounds)
      currentPath?.draw(in: translucentDrawingContext)
    } else {
      currentPath?.drawLastPoint(in: drawingContext)
    }

    setFrozenImageNeedsUpdate()
    setNeedsDisplay(updateRect)
  }

  func endPath() {
    if currentPath?.isTranslucent == true {
      currentPath?.draw(in: drawingContext)
    }
    currentPath = nil
  }

  func clear() {
    paths.removeAll()
    pathIds.removeAll()
    currentPath = nil
    needsFullRedraw = true
    setNeedsDisplay()
    notifyPathsUpdate()
  }

  private func createImage(
    transparent: Bool,
    includeImage: Bool,
    includeText: Bool,
    cropToImageSize: Bool
  ) -> UIImage? {
    ensureFrozenImagesUpToDate()
    if let backgroundImage, cropToImageSize {
      let rect = CGRect(x: 0, y: 0, width: backgroundImage.size.width, height: backgroundImage.size.height)
      guard rect.width > 0, rect.height > 0 else { return nil }
      UIGraphicsBeginImageContextWithOptions(rect.size, !transparent, 1)
      let context = UIGraphicsGetCurrentContext()
      if !transparent {
        context?.setFillColor(red: 1, green: 1, blue: 1, alpha: 1)
        context?.fill(rect)
      }
      let targetRect = Utility.fillImageWithSize(bounds.size, toSize: rect.size, contentMode: "AspectFill")
      if includeImage {
        backgroundImage.draw(in: rect)
      }

      if includeText {
        for text in arrSketchOnText {
          autoreleasepool {
            text.draw()
          }
        }
      }

      if let frozenImage {
        context?.draw(frozenImage, in: targetRect)
      }
      if let translucentFrozenImage, let currentPath, currentPath.isTranslucent {
        context?.draw(translucentFrozenImage, in: targetRect)
      }

      currentPath?.draw(in: context)

      if includeText {
        autoreleasepool {
          for text in arrTextOnSketch {
            text.draw()
          }
        }
      }

      let img = UIGraphicsGetImageFromCurrentImageContext()
      UIGraphicsEndImageContext()

      return img
    } else {
      let rect = bounds
      guard rect.width > 0, rect.height > 0 else { return nil }
      UIGraphicsBeginImageContextWithOptions(rect.size, !transparent, 0)
      let context = UIGraphicsGetCurrentContext()
      if !transparent {
        context?.setFillColor(red: 1, green: 1, blue: 1, alpha: 1)
        context?.fill(rect)
      }
      if let backgroundImage, includeImage {
        let targetRect = Utility.fillImageWithSize(
          backgroundImage.size,
          toSize: rect.size,
          contentMode: backgroundImageContentMode
        )
        backgroundImage.draw(in: targetRect)
      }

      if includeText {
        for text in arrSketchOnText {
          autoreleasepool {
            text.draw()
          }
        }
      }

      if let frozenImage {
        context?.draw(frozenImage, in: rect)
      }
      if let translucentFrozenImage, let currentPath, currentPath.isTranslucent {
        context?.draw(translucentFrozenImage, in: rect)
      }

      currentPath?.draw(in: context)

      if includeText {
        for text in arrTextOnSketch {
          autoreleasepool {
            text.draw()
          }
        }
      }

      let img = UIGraphicsGetImageFromCurrentImageContext()
      UIGraphicsEndImageContext()

      return img
    }
  }

  func save(
    type: String,
    folder: String,
    filename: String,
    transparent: Bool,
    includeImage: Bool,
    includeText: Bool,
    cropToImageSize: Bool
  ) -> (success: Bool, path: String?) {
    autoreleasepool {
      let img = createImage(
        transparent: transparent,
        includeImage: includeImage,
        includeText: includeText,
        cropToImageSize: cropToImageSize
      )
      guard let img else { return (false, nil) }

      let tempDir = URL(fileURLWithPath: NSTemporaryDirectory(), isDirectory: true)
        .appendingPathComponent(folder)
      do {
        try FileManager.default.createDirectory(
          atPath: tempDir.path,
          withIntermediateDirectories: true,
          attributes: nil
        )
      } catch {
        return (false, nil)
      }
      let fileURL = tempDir.appendingPathComponent(filename).appendingPathExtension(type)
      let imageData = getImageData(img, type: type)
      try? imageData?.write(to: fileURL, options: .atomic)

      return (true, fileURL.path)
    }
  }

  private func scaleImage(_ originalImage: UIImage, toSize size: CGSize, contentMode mode: String?) -> UIImage {
    let format = UIGraphicsImageRendererFormat.default()
    format.opaque = false
    format.scale = UIScreen.main.scale

    format.preferredRange = .automatic

    let renderer = UIGraphicsImageRenderer(size: size, format: format)
    return renderer.image { _ in
      let targetRect = Utility.fillImageWithSize(originalImage.size, toSize: size, contentMode: mode)
      originalImage.draw(in: targetRect)
    }
  }

  func transferToBase64(
    type: String,
    transparent: Bool,
    includeImage: Bool,
    includeText: Bool,
    cropToImageSize: Bool
  ) -> String? {
    let data = transferToImageData(
      type: type,
      transparent: transparent,
      includeImage: includeImage,
      includeText: includeText,
      cropToImageSize: cropToImageSize
    )
    return data?.base64EncodedString(options: .lineLength64Characters)
  }

  func transferToImageData(
    type: String,
    transparent: Bool,
    includeImage: Bool,
    includeText: Bool,
    cropToImageSize: Bool
  ) -> Data? {
    let img = createImage(
      transparent: transparent,
      includeImage: includeImage,
      includeText: includeText,
      cropToImageSize: cropToImageSize
    )
    return getImageData(img, type: type)
  }

  private func getImageData(_ img: UIImage?, type: String) -> Data? {
    if type == "jpg" {
      return img?.jpegData(compressionQuality: 1.0)
    } else {
      return img?.pngData()
    }
  }

  private func notifyPathsUpdate() {
    onPathsChange?(paths.count)
  }

  var needsImageReload: Bool {
    backgroundImage == nil
  }
}
