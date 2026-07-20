import Foundation
import Vision

struct OCRLine: Codable {
    let text: String
    let confidence: Float
    let x: Double
    let y: Double
    let width: Double
    let height: Double
}

guard CommandLine.arguments.count >= 2 else {
    FileHandle.standardError.write(Data("Missing image path\n".utf8))
    exit(1)
}

let imageURL = URL(fileURLWithPath: CommandLine.arguments[1])
let request = VNRecognizeTextRequest()
request.recognitionLevel = .accurate
request.usesLanguageCorrection = false
request.recognitionLanguages = ["vi-VN", "en-US"]

let handler = VNImageRequestHandler(url: imageURL, options: [:])
try handler.perform([request])

let lines = (request.results ?? []).compactMap { observation -> OCRLine? in
    guard let candidate = observation.topCandidates(1).first else { return nil }
    let box = observation.boundingBox
    return OCRLine(
        text: candidate.string,
        confidence: candidate.confidence,
        x: box.origin.x,
        y: box.origin.y,
        width: box.size.width,
        height: box.size.height
    )
}

let encoder = JSONEncoder()
let data = try encoder.encode(lines)
FileHandle.standardOutput.write(data)
