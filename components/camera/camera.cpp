#include "camera.hpp"
#include "esp_log.h"
#include <memory>
#include "esp_timer.h"
#include "img_converters.h"

static const char *TAG = "CAMERA";

Camera::Camera(camera_config_t config)
{
    esp_err_t err = esp_camera_init(&config);
    if (err != ESP_OK)
    {
        ESP_LOGE(TAG, "Camera init failed: %s", esp_err_to_name(err));
        return;
    }
}

Camera::Camera() : Camera(DEFAULT_CAMERA_CONFIG) {}

Camera::~Camera()
{
    esp_camera_deinit();
}

std::shared_ptr<rawImg> Camera::capture()
{
    // capture a frame
    camera_fb_t *fb = esp_camera_fb_get();
    if (!fb)
    {
        ESP_LOGE(TAG, "Frame buffer could not be acquired");
        __THROW;
    }

    // replace this with your own function
    img_->fromFramebuffer(fb->buf, fb->width, fb->height);

    // return the frame buffer back to be reused
    esp_camera_fb_return(fb);

    return img_;
}

struct JpegAccum { uint8_t *buf; size_t size; size_t capacity; };

static size_t jpeg_out_cb(void *arg, size_t index, const void *data, size_t len)
{
    JpegAccum *acc = (JpegAccum *)arg;
    if (index + len > acc->capacity) return 0;
    memcpy(acc->buf + index, data, len);
    acc->size = index + len;
    return len;
}

static uint8_t s_jpeg_buf[20 * 1024];

void Camera::capture_jpeg(void (*callback)(const uint8_t *buf, size_t len))
{
    camera_fb_t *fb = esp_camera_fb_get();
    if (!fb) { ESP_LOGE(TAG, "fb_get failed"); return; }

    JpegAccum acc = { s_jpeg_buf, 0, sizeof(s_jpeg_buf) };
    bool ok = frame2jpg_cb(fb, 30, jpeg_out_cb, &acc);
    esp_camera_fb_return(fb);

    if (ok && acc.size > 0)
        callback(s_jpeg_buf, acc.size);
    else
        ESP_LOGE(TAG, "JPEG conversion failed");
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
