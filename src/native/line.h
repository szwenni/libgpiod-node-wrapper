#ifndef LINE_H
#define LINE_H

#include <napi.h>
#include <gpiod.hpp>
#include <memory>
#include <thread>
#include <atomic>
#include <mutex>
#include <condition_variable>
#include "chip.h"
#include "line_request.h"

class Line : public Napi::ObjectWrap<Line> {
public:
  static Napi::Object Init(Napi::Env env, Napi::Object exports);
  static Napi::FunctionReference constructor;

  Line(const Napi::CallbackInfo& info);
  ~Line();

  // Wrapped methods
  Napi::Value GetValue(const Napi::CallbackInfo& info);
  Napi::Value SetValue(const Napi::CallbackInfo& info);
  Napi::Value Export(const Napi::CallbackInfo& info);
  Napi::Value Unexport(const Napi::CallbackInfo& info);
  Napi::Value Watch(const Napi::CallbackInfo& info);
  Napi::Value Unwatch(const Napi::CallbackInfo& info);

private:
  std::shared_ptr<Chip> chip_;
  unsigned int offset_;
  std::shared_ptr<LineRequest> request_;
  bool exported_;
  
  // Watching thread
  std::thread watch_thread_;
  std::atomic<bool> watching_;
  std::mutex watch_mutex_;
  std::condition_variable watch_cv_;
  Napi::ThreadSafeFunction tsfn_;

  // Internal methods
  void WatchThread();
  void StopWatchThread();
};

#endif // LINE_H
