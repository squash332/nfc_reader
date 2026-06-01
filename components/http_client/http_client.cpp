#include "http_client.hpp"
static const char *TAG = "HTTP_CLIENT";
#define BASE_URL CONFIG_BASE_URL
#define WS_URL CONFIG_WS_URL

static esp_websocket_client_handle_t ws_client = NULL;
static volatile bool _ws_connected = false;

static void ws_event_handler(void *arg, esp_event_base_t base, int32_t event_id, void *data)
{
    switch (event_id) {
    case WEBSOCKET_EVENT_CONNECTED:
        _ws_connected = true;
        ESP_LOGI(TAG, "WS connected");
        break;
    case WEBSOCKET_EVENT_DISCONNECTED:
    case WEBSOCKET_EVENT_ERROR:
    case WEBSOCKET_EVENT_CLOSED:
        _ws_connected = false;
        ESP_LOGW(TAG, "WS disconnected");
        break;
    default:
        break;
    }
}

bool ws_is_connected() {
    return _ws_connected;
}

void ws_init()
{
    esp_websocket_client_config_t cfg = {};
    cfg.uri = WS_URL;
    cfg.reconnect_timeout_ms = 5000;
    cfg.network_timeout_ms = 10000;
    cfg.ping_interval_sec = 10;
    cfg.buffer_size = 16400;

    ws_client = esp_websocket_client_init(&cfg);
    esp_websocket_register_events(ws_client, WEBSOCKET_EVENT_ANY, ws_event_handler, NULL);
    esp_websocket_client_start(ws_client);
    vTaskDelay(pdMS_TO_TICKS(500));
    ESP_LOGI(TAG, "WebSocket started");
}

bool send_frame(const uint8_t *buf, size_t len)
{
    if (!ws_client || !buf || len == 0)
        return false;

    if (!_ws_connected)
    {
        ESP_LOGW(TAG, "WS not connected, skipping frame");
        return false;
    }
    int ret = esp_websocket_client_send_bin(ws_client, (const char *)buf, len, pdMS_TO_TICKS(2000));
    if (ret < 0)
    {
        ESP_LOGW(TAG, "WS send failed");
        return false;
    }
    ESP_LOGI(TAG, "Frame sent, %d bytes", len);
    return true;
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