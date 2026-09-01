const {
    onCall
} = require("firebase-functions/v2/https");

const {
    defineSecret
} = require("firebase-functions/params");

const PAYZA_ADMIN_KEY =
    defineSecret("PAYZA_ADMIN_KEY");


exports.verifyPayzaAdminKey =
    onCall(
        {
            secrets: [
                PAYZA_ADMIN_KEY
            ]
        },

        async (request) => {

            const enteredKey =
                String(
                    request.data?.key || ""
                ).trim();


            if (!enteredKey) {

                return {
                    authorized: false
                };

            }


            const realKey =
                PAYZA_ADMIN_KEY.value();


            if (
                enteredKey !==
                realKey
            ) {

                return {
                    authorized: false
                };

            }


            return {
                authorized: true
            };

        }
    );