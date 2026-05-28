#include "http_client.hpp"

static const char *TAG = "HTTP_CLIENT";

#define BASE_URL CONFIG_BASE_URL


void send_POST(const char *card_uid)
{
    esp_http_client_config_t cfg = {};
    cfg.url        = BASE_URL "/event";
    cfg.method     = HTTP_METHOD_POST;
    cfg.timeout_ms = 2000;

    esp_http_client_handle_t c = esp_http_client_init(&cfg);
    if (!c) { ESP_LOGE(TAG, "client init failed"); return; }

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