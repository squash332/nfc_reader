#include "camera.hpp"
#include "esp_log.h"
#include "esp_timer.h"
#include "img_converters.h"

static const char *TAG = "CAMERA";

Camera::Camera(camera_config_t config) : _config(config)
{
    esp_err_t err = esp_camera_init(&_config);
    if (err != ESP_OK)
    {
        ESP_LOGE(TAG, "Camera init failed: %s", esp_err_to_name(err));
        return;
    }
}

Camera::Camera() : Camera(DEFAULT_CAMERA_CONFIG_EYE) {}

Camera::~Camera()
{
    esp_camera_deinit();
}

std::shared_ptr<std::vector<uint8_t>> Camera::capture()
{
    camera_fb_t *fb = esp_camera_fb_get();
    if (!fb)
    {
        ESP_LOGE(TAG, "Frame buffer could not be acquired");
        return nullptr;
    }
    auto jpg = std::make_shared<std::vector<uint8_t>>(fb->buf, fb->buf + fb->len);
    esp_camera_fb_return(fb);
    return jpg;
}

void Camera::measure_fps(uint16_t num_frames)
{
    uint64_t t = esp_timer_get_time();
    uint32_t total_size = 0;
    for (int i = 0; i < num_frames; i++)
    {
        camera_fb_t *fb = esp_camera_fb_get();
        if (fb)
        {
            total_size += fb->len;
            esp_camera_fb_return(fb);
        }
    }
    t = esp_timer_get_time() - t;
    float fps = num_frames * 1000000.0f / t;
    ESP_LOGI(TAG, "FPS: %.2f, avg frame size: %lu bytes", fps, num_frames ? total_size / num_frames : 0);
}
