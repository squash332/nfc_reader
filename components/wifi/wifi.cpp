#include "wifi.hpp"

const char *ssid = "SSID";
const char *password = "PW";

static uint32_t conn_retry_num = 0;
static const char *TAG = "WIFI";

static EventGroupHandle_t s_wifi_event_group;

esp_err_t res;

static void wifi_event_handler(void *arg, esp_event_base_t event_base,
                               int32_t event_id, void *event_data)
{
    if (event_base == WIFI_EVENT && event_id == WIFI_EVENT_STA_START)
    {
        ESP_LOGI(TAG, "Connecting to AP...");
        esp_wifi_connect();
    }
    else if (event_base == WIFI_EVENT && event_id == WIFI_EVENT_STA_DISCONNECTED)
    {
        if (conn_retry_num < MAX_FAILURES)
        {
            ESP_LOGI(TAG, "Reconnecting to AP...");
            esp_wifi_connect();
            conn_retry_num++;
        }
        else
        {
            xEventGroupSetBits(s_wifi_event_group, WIFI_FAILURE);
        }
    }
    else if (event_base == IP_EVENT && event_id == IP_EVENT_STA_GOT_IP) {
        ESP_LOGI(TAG, "Got ip");
        conn_retry_num = 0;
        xEventGroupSetBits(s_wifi_event_group, WIFI_SUCCESS);
    }
}

esp_err_t wifi_init_sta()
{
    esp_err_t status = WIFI_FAILURE;
    // setup network interface and wifi driver
    s_wifi_event_group = xEventGroupCreate();
    ESP_ERROR_CHECK(esp_netif_init());

    ESP_ERROR_CHECK(esp_event_loop_create_default());
    esp_netif_create_default_wifi_sta();

    wifi_init_config_t cfg = WIFI_INIT_CONFIG_DEFAULT();
    ESP_ERROR_CHECK(esp_wifi_init(&cfg));

    esp_event_handler_instance_t wifi_handler_event_instance;
    esp_event_handler_instance_t got_ip_event_instance;

    ESP_ERROR_CHECK(esp_event_handler_instance_register(WIFI_EVENT, ESP_EVENT_ANY_ID, &wifi_event_handler, NULL, &wifi_handler_event_instance));
    ESP_ERROR_CHECK(esp_event_handler_instance_register(IP_EVENT, IP_EVENT_STA_GOT_IP, &wifi_event_handler, NULL, &got_ip_event_instance));

    wifi_config_t wifi_config = {
        .sta = {
            .ssid = EXAMPLE_ESP_WIFI_SSID,
            .password = EXAMPLE_ESP_WIFI_PASS,
            .scan_method = WIFI_FAST_SCAN,
            .bssid_set = false,
            .bssid = {0},
            .channel = 0,
            .listen_interval = 3,
            .sort_method = WIFI_CONNECT_AP_BY_SIGNAL,
            .threshold = {
                .rssi = -127,
                .authmode = WIFI_AUTH_WPA2_WPA3_PSK,
                .rssi_5g_adjustment = 0,
            },

            .pmf_cfg = {.capable = true, .required = false},
            .rm_enabled = 0,
            .btm_enabled = 0,
            .mbo_enabled = 0,
            .ft_enabled = 0,
            .owe_enabled = 0,
            .transition_disable = 0,
            .reserved1 = 0,
            .sae_pwe_h2e = WPA3_SAE_PWE_UNSPECIFIED,
            .sae_pk_mode = WPA3_SAE_PK_MODE_DISABLED,
            .failure_retry_cnt = 0,
            .he_dcm_set = 0,
            .he_dcm_max_constellation_tx = 0,
            .he_dcm_max_constellation_rx = 0,
            .he_mcs9_enabled = 0,
            .he_su_beamformee_disabled = 0,
            .he_trig_su_bmforming_feedback_disabled = 0,
            .he_trig_mu_bmforming_partial_feedback_disabled = 0,
            .he_trig_cqi_feedback_disabled = 0,
            .vht_su_beamformee_disabled = 0,
            .vht_mu_beamformee_disabled = 0,
            .vht_mcs8_enabled = 0,
            .reserved2 = 0,
            .sae_h2e_identifier = "\0",

        },
    };

    ESP_ERROR_CHECK(esp_wifi_set_mode(WIFI_MODE_STA));
    ESP_ERROR_CHECK(esp_wifi_set_config(WIFI_IF_STA, &wifi_config));
    ESP_ERROR_CHECK(esp_wifi_start());

    ESP_LOGI(TAG, "wifi_init_sta finished.");

    EventBits_t bits = xEventGroupWaitBits(s_wifi_event_group,
                                           WIFI_SUCCESS | WIFI_FAILURE,
                                           pdFALSE,
                                           pdFALSE,
                                           portMAX_DELAY);

    if (bits & WIFI_SUCCESS)
    {
        ESP_LOGI(TAG, "Connected to ap");
        status = WIFI_SUCCESS;
    }
    else if (bits & WIFI_FAILURE)
    {
        ESP_LOGI(TAG, "Failed to connect to ap");
        status = WIFI_FAILURE;
    }
    else
    {
        ESP_LOGE(TAG, "UNEXPECTED EVENT");
        status = WIFI_FAILURE;
    }

    /* The event will not be processed after unregister */
    ESP_ERROR_CHECK(esp_event_handler_instance_unregister(IP_EVENT, IP_EVENT_STA_GOT_IP, got_ip_event_instance));
    ESP_ERROR_CHECK(esp_event_handler_instance_unregister(WIFI_EVENT, ESP_EVENT_ANY_ID, wifi_handler_event_instance));
    vEventGroupDelete(s_wifi_event_group);

    return status;
}

esp_err_t nvs_init()
{
    esp_err_t ret = nvs_flash_init();

    if (ret == ESP_ERR_NVS_NO_FREE_PAGES || 
        ret == ESP_ERR_NVS_NEW_VERSION_FOUND)
    {
        ESP_ERROR_CHECK(nvs_flash_erase());
        ret = nvs_flash_init();
    }
    ESP_ERROR_CHECK(ret);

    ESP_LOGI(TAG, "NVS INITIALIZED");
    // wifi_init_sta();
    return ret;
}