idf_component_register(SRCS "main.cpp"
                    INCLUDE_DIRS "."
                    REQUIRES wifi http_client nfc_sensor board_cfg)
