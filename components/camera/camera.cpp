#include "camera.hpp"
#include "esp_log.h"

static const char *TAG = "CAMERA";

Camera::Camera(camera_config_t config)
{
    esp_err_t err = esp_camera_init(&config);
    if (err != ESP_OK)
        ESP_LOGE(TAG, "Camera init failed: %s", esp_err_to_name(err));
    else
        ESP_LOGI(TAG, "Camera initialized");
}

Camera::Camera() : Camera(DEFAULT_CAMERA_CONFIG) {}

Camera::~Camera()
{
    esp_camera_deinit();
}

void Camera::stream_frame(void (*callback)(const uint8_t *buf, size_t len))
{
    camera_fb_t *fb = esp_camera_fb_get();
    if (!fb)
    {
        ESP_LOGE(TAG, "fb_get failed");
        return;
    }
    callback(fb->buf, fb->len);
    esp_camera_fb_return(fb);
}
