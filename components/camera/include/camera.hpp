#pragma once

#include "esp_camera.h"
#include "raw_img.hpp"

static constexpr camera_config_t DEFAULT_CAMERA_CONFIG{
    .pin_pwdn = -1,
    .pin_reset = -1,
    .pin_xclk = 16,
    .pin_sccb_sda = 4,
    .pin_sccb_scl = 5,
    .pin_d7 = 15,
    .pin_d6 = 17,
    .pin_d5 = 36,
    .pin_d4 = 12,
    .pin_d3 = 37,
    .pin_d2 = 3,
    .pin_d1 = 8,
    .pin_d0 = 46,
    .pin_vsync = 9,
    .pin_href = 6,
    .pin_pclk = 7,
    .xclk_freq_hz = 10000000,
    .ledc_timer = LEDC_TIMER_0,
    .ledc_channel = LEDC_CHANNEL_0,
    .pixel_format = PIXFORMAT_GRAYSCALE,
    .frame_size = FRAMESIZE_QQVGA,
    .jpeg_quality = 15,
    .fb_count = 2,
    .fb_location = CAMERA_FB_IN_DRAM,
    .grab_mode = CAMERA_GRAB_LATEST,
    .sccb_i2c_port = 1,
};

class Camera
{
public:
    Camera(camera_config_t config);
    Camera();
    ~Camera();

    Camera(const Camera &) = delete;
    Camera &operator=(const Camera &) = delete;

    void measure_fps(uint16_t num_frames);
    std::shared_ptr<rawImg> capture();
    void capture_jpeg(void (*callback)(const uint8_t *buf, size_t len));

private:
    camera_config_t _config;
    std::shared_ptr<rawImg> img_ = {std::make_unique<rawImg>()};
};
