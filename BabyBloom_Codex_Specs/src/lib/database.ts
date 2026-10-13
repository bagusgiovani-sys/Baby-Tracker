export type Json = string | number | boolean | null | {
    [key: string]: Json | undefined;
} | Json[];
export type Database = {
    public: {
        Tables: Record<string, never>;
        Views: Record<string, never>;
        Enums: Record<string, never>;
        CompositeTypes: Record<string, never>;
        Functions: {
            create_baby: {
                Args: {
                    p_input: Json;
                };
                Returns: Json;
            };
            list_babies: {
                Args: Record<PropertyKey, never>;
                Returns: Json;
            };
            list_events: {
                Args: {
                    p_baby_id: string;
                    p_after: string | null;
                    p_after_id: string | null;
                };
                Returns: Json;
            };
            save_care_event: {
                Args: {
                    p_event: Json;
                    p_mutation_id: string;
                    p_expected_version: number;
                    p_operation: string;
                    p_future_confirmed: boolean;
                };
                Returns: Json;
            };
        };
    };
};
