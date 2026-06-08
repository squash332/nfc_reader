#include "http_client.hpp"
static const char *TAG = "HTTP_CLIENT";
#define BASE_URL CONFIG_BASE_URL

static esp_http_client_handle_t frame_client = NULL;

void http_init()
{
    esp_http_client_config_t cfg = {};
    cfg.url = BASE_URL "/camera/frame";
    cfg.method = HTTP_METHOD_POST;
    cfg.timeout_ms = 3000;
    cfg.keep_alive_enable = true;

    frame_client = esp_http_client_init(&cfg);
    ESP_LOGI(TAG, "HTTP client ready");
}

int send_frame(const uint8_t *buf, size_t len)
{
    if (!frame_client || !buf || len == 0)
        return 0;

    esp_http_client_set_header(frame_client, "Content-Type", "image/jpeg");

    esp_err_t err = esp_http_client_open(frame_client, len);
    if (err != ESP_OK)
    {
        ESP_LOGW(TAG, "open failed: %s", esp_err_to_name(err));
        esp_http_client_close(frame_client);
        return 0;
    }

    int written = esp_http_client_write(frame_client, (const char *)buf, len);
    if (written < 0)
    {
        ESP_LOGW(TAG, "write failed");
        esp_http_client_close(frame_client);
        return 0;
    }

    esp_http_client_fetch_headers(frame_client);
    int status = esp_http_client_get_status_code(frame_client);

    if (status == 503)
    {
        ESP_LOGW(TAG, "camera disabled by server, cleaning up");
        esp_http_client_cleanup(frame_client);
        frame_client = NULL;
        return -1;
    }

    return 1;
}

bool http_client_active()
{
    return frame_client != NULL;
}

bool camera_is_enabled()
{
    esp_http_client_config_t cfg = {};
    cfg.url = BASE_URL "/camera/enabled";
    cfg.method = HTTP_METHOD_GET;
    cfg.timeout_ms = 3000;

    esp_http_client_handle_t c = esp_http_client_init(&cfg);
    if (!c)
        return false;

    esp_err_t err = esp_http_client_open(c, 0);
    if (err != ESP_OK)
    {
        esp_http_client_cleanup(c);
        return false;
    }

    esp_http_client_fetch_headers(c);

    char buf[64] = {};
    esp_http_client_read(c, buf, sizeof(buf) - 1);
    esp_http_client_cleanup(c);

    return strstr(buf, "\"enabled\":true") != NULL || strstr(buf, "\"enabled\": true") != NULL;
}

void send_POST(const char *card_uid)
{
    esp_http_client_config_t cfg = {};
    cfg.url = BASE_URL "/event";
    cfg.method = HTTP_METHOD_POST;
    cfg.timeout_ms = 3000;

    esp_http_client_handle_t c = esp_http_client_init(&cfg);
    if (!c)
    {
        ESP_LOGE(TAG, "client init failed");
        return;
    }

    cJSON *root = cJSON_CreateObject();
    cJSON_AddStringToObject(root, "card_uid", card_uid);
    char *json = cJSON_PrintUnformatted(root);
    cJSON_Delete(root);

    esp_http_client_set_header(c, "Content-Type", "application/json");
    esp_http_client_set_post_field(c, json, strlen(json));

    esp_err_t err = esp_http_client_perform(c);
    free(json);

    if (err == ESP_OK)
        ESP_LOGI(TAG, "POST ok, status=%d", esp_http_client_get_status_code(c));
    else
        ESP_LOGE(TAG, "POST failed: %s", esp_err_to_name(err));

    esp_http_client_cleanup(c);
}
