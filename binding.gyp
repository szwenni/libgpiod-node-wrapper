{
  "targets": [
    {
      "target_name": "gpiod2",
      "cflags!": [ "-fno-exceptions" ],
      "cflags_cc!": [ "-fno-exceptions" ],
      "sources": [ 
        "src/native/libgpiod2.cpp",
        "src/native/chip.cpp",
        "src/native/line.cpp",
        "src/native/line_config.cpp",
        "src/native/line_request.cpp"
      ],
      "include_dirs": [
        "<!@(node -p \"require('node-addon-api').include\")"
      ],
      "libraries": [
        "-lgpiodcxx"
      ],
      "defines": [ "NAPI_DISABLE_CPP_EXCEPTIONS" ]
    }
  ]
}
