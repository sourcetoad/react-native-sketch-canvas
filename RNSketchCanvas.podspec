require 'json'

package = JSON.parse(File.read(File.join(__dir__, 'package.json')))

Pod::Spec.new do |s|
  s.name         = 'RNSketchCanvas'
  s.version      = package['version']
  s.summary      = package['description']
  s.homepage     = 'https://github.com/sourcetoad/react-native-sketch-canvas'
  s.license      = package['license']
  s.authors      = package['author']
  s.source       = { :git => package['repository']['url'] }
  s.resource_bundles = { 'RNSketchCanvas_PrivacyInfo' => 'ios/RNSketchCanvas/PrivacyInfo.xcprivacy' }
  s.platform     = :ios, '8.0'
  s.source_files = 'ios/**/*.{h,m}'
  s.dependency   'React'
end
