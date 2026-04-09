#include "http_client.hpp"

static const char *TAG = "HTTP_CLIENT";

void send_POST(const char *text) {
    esp_http_client_config_t cfg = {};
    cfg.url = "ex";
    cfg.method = HTTP_METHOD_POST;
    cfg.cert_pem = NULL;
    cfg.skip_cert_common_name_check = true;

    esp_http_client_handle_t client = esp_http_client_init(&cfg);
    if (client == NULL)
    {
        ESP_LOGE("HTTP_TAG", "Failed to initialize HTTP Client!");
        return;
    }

    esp_http_client_set_header(client, "Content-Type", "application/json");

    char post_data[128];

    cJSON *root = cJSON_CreateObject();
    cJSON_AddStringToObject(root, "text", text);
    char *json_str = cJSON_PrintUnformatted(root);

    strncpy(post_data, json_str, sizeof(post_data));

    cJSON_Delete(root);
    free(json_str);


    esp_http_client_set_post_field(client, post_data, strlen(post_data));

    esp_err_t err = esp_http_client_perform(client);
    if (err == ESP_OK) {
        int status = esp_http_client_get_status_code(client);
        ESP_LOGI(TAG, "POST successful, status = %d", status);
    }
    else {
        ESP_LOGE(TAG, "POST unsuccessful: %s", esp_err_to_name(err));
    }

    esp_http_client_cleanup(client);

}