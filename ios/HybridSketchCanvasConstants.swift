import Foundation
import NitroModules

class HybridSketchCanvasConstants: HybridSketchCanvasConstantsSpec {
  var mainBundlePath: String { Bundle.main.bundlePath }
  var documentDirectory: String { Self.path(.documentDirectory) }
  var libraryDirectory: String { Self.path(.libraryDirectory) }
  var cachesDirectory: String { Self.path(.cachesDirectory) }

  private static func path(_ directory: FileManager.SearchPathDirectory) -> String {
    NSSearchPathForDirectoriesInDomains(directory, .userDomainMask, true).first ?? ""
  }
}
