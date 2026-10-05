require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "RNSketchCanvas"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = package["homepage"]
  s.license      = package["license"]
  s.authors      = package["author"]

  s.platforms    = { :ios => min_ios_version_supported }
  s.source       = { :git => "https://github.com/sourcetoad/react-native-sketch-canvas", :tag => "#{s.version}" }
  s.resource_bundles = { 'RNSketchCanvas_PrivacyInfo' => 'ios/PrivacyInfo.xcprivacy' }

  s.source_files = "ios/**/*.{swift}"
  s.swift_version = '5.0'

  load 'nitrogen/generated/ios/RNSketchCanvas+autolinking.rb'
  add_nitrogen_files(s)

  install_modules_dependencies(s)
end
