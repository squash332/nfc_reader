#include "http_client.hpp"

static const char *TAG = "HTTP_CLIENT";

static esp_http_client_handle_t client = NULL;

void http_init(void)
{
    esp_http_client_config_t cfg = {};
    cfg.url = "ex"; 
    cfg.method = HTTP_METHOD_POST;
    cfg.cert_pem = NULL;
    cfg.timeout_ms = 2000;

    client = esp_http_client_init(&cfg);

    if (client == NULL)
    {
        ESP_LOGE(TAG, "Failed to init HTTP client");
    }
}

void send_POST(const char *card_uid)
{
    if (client == NULL)
    {
        ESP_LOGE(TAG, "HTTP client not initialized");
        return;
    }

    esp_http_client_set_header(client, "Content-Type", "application/json");

    char post_data[256];

    cJSON *root = cJSON_CreateObject();
    cJSON_AddStringToObject(root, "card_uid", (char *)card_uid);
    char *json_str = cJSON_PrintUnformatted(root);

    snprintf(post_data, sizeof(post_data), "%s", json_str);

    cJSON_Delete(root);
    free(json_str);

    esp_http_client_set_post_field(client, post_data, strlen(post_data));

    esp_err_t err = esp_http_client_perform(client);
    if (err == ESP_OK)
    {
        int status = esp_http_client_get_status_code(client);
        ESP_LOGI(TAG, "POST successful, status = %d", status);
    }
    else
    {
        ESP_LOGE(TAG, "POST unsuccessful: %s", esp_err_to_name(err));

        ESP_LOGW(TAG, "Resetting HTTP client...");

        esp_http_client_cleanup(client);
        client = NULL;

        http_init();
    }
}