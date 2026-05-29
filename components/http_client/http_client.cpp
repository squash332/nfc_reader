#include "http_client.hpp"
static const char *TAG = "HTTP_CLIENT";
#define BASE_URL CONFIG_BASE_URL
#define WS_URL CONFIG_WS_URL

static esp_websocket_client_handle_t ws_client = NULL;

bool ws_is_connected() {
    return ws_client && esp_websocket_client_is_connected(ws_client);
}

void ws_init()
{
    esp_websocket_client_config_t cfg = {};
    cfg.uri = WS_URL;
    cfg.reconnect_timeout_ms = 5000;
    cfg.network_timeout_ms = 5000;
    cfg.buffer_size = 16400; // 

    ws_client = esp_websocket_client_init(&cfg);
    esp_websocket_client_start(ws_client);
    vTaskDelay(pdMS_TO_TICKS(500)); // wait for connection
    ESP_LOGI(TAG, "WebSocket started");
}

void send_frame(const uint8_t *buf, size_t len)
{
    if (!ws_client)
    {
        ESP_LOGE(TAG, "WS client not initialized");
        return;
    }
    if (!buf || len == 0)
    {
        ESP_LOGE(TAG, "Invalid frame data");
        return;
    }

    if (!esp_websocket_client_is_connected(ws_client))
    {
        ESP_LOGW(TAG, "WS not connected, skipping frame");
        return;
    }
    int ret = esp_websocket_client_send_bin(ws_client, (const char *)buf, len, 0);
    if (ret < 0)
        ESP_LOGW(TAG, "WS send failed");
    else
        ESP_LOGI(TAG, "Frame sent, %d bytes", len);
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