#include <napi.h>
#include "chip.h"
#include "line.h"
#include "line_config.h"
#include "line_request.h"

Napi::Object InitAll(Napi::Env env, Napi::Object exports) {
  // Register all classes
  Chip::Init(env, exports);
  Line::Init(env, exports);
  LineConfig::Init(env, exports);
  LineRequest::Init(env, exports);
  
  return exports;
}

NODE_API_MODULE(libgpiod2, InitAll)
