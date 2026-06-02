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

std::vector<uint8_t> Camera::capture()
{
    camera_fb_t *fb = esp_camera_fb_get();
    if (!fb)
    {
        ESP_LOGE(TAG, "Frame buffer could not be acquired");
        return {};
    }
    std::vector<uint8_t> data(fb->buf, fb->buf + fb->len);
    esp_camera_fb_return(fb);
    return data;
}