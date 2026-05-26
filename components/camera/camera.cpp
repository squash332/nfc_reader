#include "camera.hpp"
#include "esp_log.h"

Camera::Camera(camera_config_t config) : _config(config)
{
    esp_err_t err = esp_camera_init(&_config);
    if (err != ESP_OK)
    {
        ESP_LOGE("CAMERA", "Camera init failed!");
    }
    else {
        ESP_LOGI("CAMERA", "Camera initialized successfully");
    }
}

Camera::Camera() : Camera::Camera(DEFAULT_CAMERA_CONFIG)
{
}

Camera::~Camera()
{
    esp_camera_deinit();
}

void Camera::stream_frame(void (*callback)(const uint8_t *buf, size_t len))
{
    camera_fb_t *fb = esp_camera_fb_get();
    if (!fb)
    {
        ESP_LOGE("CAMERA", "stream_frame: fb_get failed");
        return;
    }
    callback(fb->buf, fb->len);
    esp_camera_fb_return(fb);
}

std::shared_ptr<rawImg> Camera::capture()
{
    camera_fb_t *fb = esp_camera_fb_get();
    if (!fb)
    {
        ESP_LOGE("CAMERA", "Camera capture failed!");
        return img_;
    }
    img_->fromFramebuffer(fb->buf, fb->width, fb->height);
    esp_camera_fb_return(fb);
    return img_;
}