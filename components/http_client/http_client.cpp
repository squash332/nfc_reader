#include "http_client.hpp"

static const char *TAG = "HTTP_CLIENT";

#define BASE_URL "http://10.138.208.78:8000"

static esp_http_client_handle_t client       = NULL;
static esp_http_client_handle_t frame_client = NULL;

void http_init(void)
{
    esp_http_client_config_t cfg = {};
    cfg.url        = BASE_URL "/event";
    cfg.method     = HTTP_METHOD_POST;
    cfg.timeout_ms = 2000;

    client = esp_http_client_init(&cfg);
    if (client == NULL)
        ESP_LOGE(TAG, "Failed to init event client");

    esp_http_client_config_t fcfg = {};
    fcfg.url        = BASE_URL "/camera/frame";
    fcfg.method     = HTTP_METHOD_POST;
    fcfg.timeout_ms = 1000; // frames are time-sensitive — fail fast

    frame_client = esp_http_client_init(&fcfg);
    if (frame_client == NULL)
        ESP_LOGE(TAG, "Failed to init frame client");

    ESP_LOGI(TAG, "HTTP init successful!");
}

// ── NFC event ────────────────────────────────────────────────────────────────

void send_POST(const char *card_uid)
{
    if (client == NULL)
    {
        ESP_LOGE(TAG, "Event client not initialized");
        return;
    }

    esp_http_client_set_header(client, "Content-Type", "application/json");

    cJSON *root = cJSON_CreateObject();
    cJSON_AddStringToObject(root, "card_uid", (char *)card_uid);
    char *json_str = cJSON_PrintUnformatted(root);
    cJSON_Delete(root);

    esp_http_client_set_post_field(client, json_str, strlen(json_str));
    esp_err_t err = esp_http_client_perform(client);
    free(json_str);

    if (err == ESP_OK)
        ESP_LOGI(TAG, "Event POST status=%d", esp_http_client_get_status_code(client));
    else
    {
        ESP_LOGW(TAG, "Event POST failed: %s — reinitializing", esp_err_to_name(err));
        esp_http_client_cleanup(client);
        client = NULL;
        http_init();
    }
}

// ── Camera frames ─────────────────────────────────────────────────────────────

void send_frame(const uint8_t *buf, size_t len)
{
    if (frame_client == NULL)
    {
        ESP_LOGE(TAG, "Frame client not initialized");
        return;
    }

    esp_http_client_set_header(frame_client, "Content-Type", "image/jpeg");
    esp_http_client_set_post_field(frame_client, (const char *)buf, len);

    esp_err_t err = esp_http_client_perform(frame_client);
    if (err != ESP_OK)
    {
        ESP_LOGW(TAG, "Frame send failed: %s — reinitializing", esp_err_to_name(err));
        esp_http_client_cleanup(frame_client);
        frame_client = NULL;
        http_init();
    }
}

// ── Camera command polling ────────────────────────────────────────────────────

// Returns true if the backend says streaming should be active.
bool poll_camera_active(void)
{
    esp_http_client_config_t cfg = {};
    cfg.url        = BASE_URL "/camera/command";
    cfg.method     = HTTP_METHOD_GET;
    cfg.timeout_ms = 500;

    esp_http_client_handle_t h = esp_http_client_init(&cfg);
    if (!h) return false;

    char buf[32] = {};
    bool active  = false;

    if (esp_http_client_open(h, 0) == ESP_OK)
    {
        esp_http_client_fetch_headers(h);
        int len = esp_http_client_read(h, buf, sizeof(buf) - 1);
        if (len > 0)
            active = (strstr(buf, "true") != NULL);
    }

    esp_http_client_close(h);
    esp_http_client_cleanup(h);
    return active;
}

// Tells the backend to activate streaming (called on local trigger like NFC).
void notify_camera_start(void)
{
    esp_http_client_config_t cfg = {};
    cfg.url        = BASE_URL "/camera/start";
    cfg.method     = HTTP_METHOD_POST;
    cfg.timeout_ms = 1000;

    esp_http_client_handle_t h = esp_http_client_init(&cfg);
    if (!h) return;

    esp_http_client_set_post_field(h, "", 0);
    esp_http_client_perform(h);
    esp_http_client_cleanup(h);
    ESP_LOGI(TAG, "Camera start notified");
}
