#include "http_client.hpp"

static const char *TAG = "HTTP_CLIENT";

#define BASE_URL CONFIG_BASE_URL

static esp_http_client_handle_t frame_client = NULL;

static void frame_client_init()
{
    esp_http_client_config_t cfg = {};
    cfg.url = BASE_URL "/camera/frame";
    cfg.method = HTTP_METHOD_POST;
    cfg.timeout_ms = 4000;
    frame_client = esp_http_client_init(&cfg);
}

void send_frame(const uint8_t *buf, size_t len)
{
    if (!frame_client)
        frame_client_init();
    if (!frame_client)
    {
        ESP_LOGE(TAG, "frame client init failed");
        return;
    }

    esp_http_client_set_header(frame_client, "Content-Type", "image/jpeg");
    esp_http_client_set_post_field(frame_client, (const char *)buf, len);

    esp_err_t err = esp_http_client_perform(frame_client);
    if (err == ESP_OK)
        ESP_LOGI(TAG, "Frame ok, status=%d", esp_http_client_get_status_code(frame_client));
    else
    {
        ESP_LOGW(TAG, "Frame failed: %s — reconnecting", esp_err_to_name(err));
        esp_http_client_cleanup(frame_client);
        vTaskDelay(pdMS_TO_TICKS(1000));
    }
}

void send_POST(const char *card_uid)
{
    esp_http_client_config_t cfg = {};
    cfg.url = BASE_URL "/event";
    cfg.method = HTTP_METHOD_POST;
    cfg.timeout_ms = 2000;

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