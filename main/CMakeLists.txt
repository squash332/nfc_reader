idf_component_register(SRCS "main.cpp" "helpers.cpp"
                    INCLUDE_DIRS "include" 
                    REQUIRES wifi http_client nfc_sensor board_cfg camera)
