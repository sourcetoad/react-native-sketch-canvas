import Foundation
import NitroModules
import UIKit

class HybridSketchCanvasView: HybridSketchCanvasViewSpec {
  private let canvas = MainActor.assumeIsolated { SketchCanvasCore(frame: .zero) }
  private var appliedImage = (filename: "", directory: "", mode: "")

  var view: UIView { canvas }

  var localSourceImage: LocalSourceImage?

  var text: [SketchCanvasText]? {
    didSet {
      let inputs = (text ?? []).map(Self.canvasTextInput)
      MainActor.assumeIsolated { canvas.setCanvasText(inputs) }
    }
  }

  var onCanvasReady: (() -> Void)? {
    didSet {
      let callback = onCanvasReady
      MainActor.assumeIsolated { canvas.onCanvasReady = callback }
    }
  }

  var onPathsChange: ((_ count: Double) -> Void)? {
    didSet {
      let callback = onPathsChange.map { callback in { (count: Int) in callback(Double(count)) } }
      MainActor.assumeIsolated { canvas.onPathsChange = callback }
    }
  }

  var onInitialPathsLoaded: ((_ count: Double) -> Void)?

  func afterUpdate() {
    let image = (
      filename: localSourceImage?.filename ?? "",
      directory: localSourceImage?.directory ?? "",
      mode: localSourceImage?.mode ?? ""
    )
    let shouldLoadImage = image != appliedImage
    appliedImage = image

    MainActor.assumeIsolated {
      if (shouldLoadImage || canvas.needsImageReload) && !image.filename.isEmpty {
        canvas.openSketchFile(image.filename, directory: image.directory, contentMode: image.mode)
      }
    }
  }

  func newPath(pathId: Double, color: Double, width: Double) throws {
    let id = Self.int32(pathId)
    let strokeColor = Self.uiColor(fromProcessedColor: color)
    let strokeWidth = Int(Self.int32(width))
    DispatchQueue.main.async { [canvas] in
      canvas.newPath(id, strokeColor: strokeColor, strokeWidth: strokeWidth)
    }
  }

  func addPoint(x: Double, y: Double) throws {
    DispatchQueue.main.async { [canvas] in
      canvas.addPoint(x: Float(x), y: Float(y))
    }
  }

  func endPath() throws {
    DispatchQueue.main.async { [canvas] in
      canvas.endPath()
    }
  }

  func addPath(pathId: Double, color: Double, width: Double, points: [String]) throws {
    let id = Self.int32(pathId)
    let strokeColor = Self.uiColor(fromProcessedColor: color)
    let strokeWidth = Int(Self.int32(width))
    let cgPoints = points.compactMap(Self.point)
    DispatchQueue.main.async { [canvas] in
      canvas.addPath(id, strokeColor: strokeColor, strokeWidth: strokeWidth, points: cgPoints)
    }
  }

  func addInitialPaths(paths: [SketchCanvasInitialPath]) throws {
    DispatchQueue.main.async { [weak self] in
      guard let self else { return }
      var validPaths: [SketchData] = []
      for pathData in paths {
        let cgPoints = pathData.points.compactMap(Self.point)
        if !cgPoints.isEmpty {
          validPaths.append(
            SketchData(
              id: Self.int32(pathData.pathId),
              strokeColor: Self.uiColor(fromProcessedColor: pathData.color),
              strokeWidth: Int(Self.int32(pathData.width)),
              points: cgPoints
            )
          )
        }
      }

      self.canvas.addPaths(validPaths)

      self.onInitialPathsLoaded?(Double(validPaths.count))
    }
  }

  func deletePath(pathId: Double) throws {
    let id = Self.int32(pathId)
    DispatchQueue.main.async { [canvas] in
      canvas.deletePath(id)
    }
  }

  func clear() throws {
    DispatchQueue.main.async { [canvas] in
      canvas.clear()
    }
  }

  func save(
    imageType: String,
    folder: String,
    filename: String,
    transparent: Bool,
    includeImage: Bool,
    includeText: Bool,
    cropToImageSize: Bool
  ) throws -> Promise<SketchCanvasSaveResult> {
    let promise = Promise<SketchCanvasSaveResult>()
    DispatchQueue.main.async { [canvas] in
      let result = canvas.save(
        type: imageType,
        folder: folder,
        filename: filename,
        transparent: transparent,
        includeImage: includeImage,
        includeText: includeText,
        cropToImageSize: cropToImageSize
      )
      promise.resolve(withResult: SketchCanvasSaveResult(success: result.success, path: result.path))
    }
    return promise
  }

  func transferToBase64(
    imageType: String,
    transparent: Bool,
    includeImage: Bool,
    includeText: Bool,
    cropToImageSize: Bool
  ) throws -> Promise<String> {
    let promise = Promise<String>()
    DispatchQueue.main.async { [canvas] in
      let base64 = canvas.transferToBase64(
        type: imageType,
        transparent: transparent,
        includeImage: includeImage,
        includeText: includeText,
        cropToImageSize: cropToImageSize
      )
      promise.resolve(withResult: base64 ?? "")
    }
    return promise
  }

  func transferToArrayBuffer(
    imageType: String,
    transparent: Bool,
    includeImage: Bool,
    includeText: Bool,
    cropToImageSize: Bool
  ) throws -> Promise<ArrayBuffer> {
    let promise = Promise<ArrayBuffer>()
    DispatchQueue.main.async { [canvas] in
      let data = canvas.transferToImageData(
        type: imageType,
        transparent: transparent,
        includeImage: includeImage,
        includeText: includeText,
        cropToImageSize: cropToImageSize
      )
      do {
        let buffer = try data.map { try ArrayBuffer.copy(data: $0) } ?? ArrayBuffer.allocate(size: 0)
        promise.resolve(withResult: buffer)
      } catch {
        promise.reject(withError: error)
      }
    }
    return promise
  }

  private static func canvasTextInput(_ text: SketchCanvasText) -> CanvasTextInput {
    CanvasTextInput(
      text: text.text,
      font: text.font ?? "",
      fontSize: text.fontSize ?? 0,
      fontColor: text.fontColor.map(uint32) ?? 0,
      overlay: text.overlay ?? "",
      anchor: CGPoint(x: text.anchor?.x ?? 0, y: text.anchor?.y ?? 0),
      position: CGPoint(x: text.position.x, y: text.position.y),
      coordinate: text.coordinate ?? "",
      alignment: text.alignment ?? "",
      lineHeightMultiple: text.lineHeightMultiple ?? 0
    )
  }

  private static func point(_ coordinate: String) -> CGPoint? {
    let coorInNumber = coordinate.components(separatedBy: ",")
    guard coorInNumber.count >= 2 else { return nil }
    return CGPoint(
      x: CGFloat((coorInNumber[0] as NSString).floatValue),
      y: CGFloat((coorInNumber[1] as NSString).floatValue)
    )
  }

  private static func int64(_ x: Double) -> Int64 {
    guard x.isFinite else { return 0 }
    return Int64(max(min(x, 9.0e18), -9.0e18))
  }

  private static func int32(_ x: Double) -> Int32 {
    Int32(truncatingIfNeeded: int64(x))
  }

  private static func uint32(_ x: Double) -> UInt32 {
    UInt32(truncatingIfNeeded: int64(x))
  }

  private static func uiColor(fromProcessedColor value: Double) -> UIColor {
    let argb = uint32(value)
    return UIColor(
      red: CGFloat((argb >> 16) & 0xFF) / 255,
      green: CGFloat((argb >> 8) & 0xFF) / 255,
      blue: CGFloat(argb & 0xFF) / 255,
      alpha: CGFloat((argb >> 24) & 0xFF) / 255
    )
  }
}
