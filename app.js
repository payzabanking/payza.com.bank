import {
    db,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    collection,
    query,
    where,
    getDocs,
    increment,
    serverTimestamp,
    onSnapshot
} from "./firebase.js";

import {
    getFunctions,
    httpsCallable
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-functions.js";


/* =========================================================
   PAYZA CURRENCY SETTINGS
   ---------------------------------------------------------
   Reads the same Firestore settings used by Admin:
   appSettings/currency

   Fields:
   - symbol
   - accountNumberCost

   IMPORTANT:
   This controls EXTERNAL MONEY only.
   Payza Credit remains ȼ̲.
========================================================= */

let payzaAccountNumberCost =
    3450;


/* =========================================================
   EXTERNAL MONEY FORMATTER
========================================================= */

function formatExternalMoney(amount) {

    const value =
        Number(amount || 0);

    return `${payzaCurrencySymbol}${value.toLocaleString(
        "en-NG",
        {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }
    )}`;

}


/* =========================================================
   LISTEN FOR ADMIN CURRENCY SETTINGS
========================================================= */

let currencySettingsListener = null;

function listenForCurrencySettings() {

    if (currencySettingsListener) {

        currencySettingsListener();

        currencySettingsListener = null;

    }


    const currencyRef =
        doc(
            db,
            "appSettings",
            "currency"
        );


    currencySettingsListener =
        onSnapshot(
            currencyRef,
            snapshot => {

                if (!snapshot.exists()) {

                    /*
                     * Keep the default currency
                     * if Admin has not created
                     * the settings document yet.
                     */

                    payzaCurrencySymbol =
                        "₦";

                    payzaAccountNumberCost =
                        3450;

                    updateExternalCurrencyUI();

                    return;

                }


                const settings =
                    snapshot.data();


                /*
                 * SAME FIELD USED BY ADMIN.
                 */

                payzaCurrencySymbol =
                    typeof settings.symbol === "string" &&
                    settings.symbol.trim() !== ""
                        ? settings.symbol.trim()
                        : "₦";


                /*
                 * SAME ACCOUNT NUMBER COST
                 * USED BY ADMIN.
                 */

                if (
                    Number.isFinite(
                        Number(
                            settings.accountNumberCost
                        )
                    )
                ) {

                    payzaAccountNumberCost =
                        Number(
                            settings.accountNumberCost
                        );

                }


                /*
                 * Refresh every external-money
                 * element immediately.
                 */

                updateExternalCurrencyUI();

            },

            error => {

                console.error(
                    "Currency settings realtime sync error:",
                    error
                );

            }
        );

}

let accountBalanceListener = null;

/* =========================================================
   UPDATE EXTERNAL CURRENCY UI
========================================================= */

function updateExternalCurrencyUI() {

    /*
     * CREDIT COST
     */

    const selectedReturn =
        document.getElementById(
            "selectedReturn"
        );


    /*
     * The Credit Cost is recalculated from
     * the existing displayed Credit amount.
     */

    const selectedAmountElement =
        document.getElementById(
            "selectedAmount"
        );


    if (
        selectedReturn &&
        selectedAmountElement
    ) {

        const creditAmount =
            Number(
                selectedAmountElement.textContent
                    .replace(/[^\d.]/g, "")
            );


        if (
            Number.isFinite(creditAmount) &&
            creditAmount > 0
        ) {

            const creditCost =
                creditAmount *
                CREDIT_COST_RATE;


            selectedReturn.textContent =
                formatExternalMoney(
                    creditCost
                );

        }

    }


    /*
     * BANK TRANSFER
     */

    const bankTransferPaymentAmount =
        document.getElementById(
            "bankTransferPaymentAmount"
        );


    if (bankTransferPaymentAmount) {

        const creditCostText =
            selectedReturn?.textContent || "";


        const creditCost =
            parseFloat(
                creditCostText.replace(
                    /[^0-9.]/g,
                    ""
                )
            );


        if (
            Number.isFinite(creditCost)
        ) {

            bankTransferPaymentAmount.textContent =
                formatExternalMoney(
                    creditCost
                );

        }

    }


    /*
     * CRYPTO PAYMENT
     */

    const cryptoPaymentAmount =
        document.getElementById(
            "cryptoPaymentAmount"
        );


    if (cryptoPaymentAmount) {

        const creditCostText =
            selectedReturn?.textContent || "";


        const creditCost =
            parseFloat(
                creditCostText.replace(
                    /[^0-9.]/g,
                    ""
                )
            );


        if (
            Number.isFinite(creditCost)
        ) {

            cryptoPaymentAmount.textContent =
                formatExternalMoney(
                    creditCost
                );

        }

    }


    /*
     * ACCOUNT NUMBER COST
     */

    const accountCostElements =
        document.querySelectorAll(
            ".receive-account-cost, .receive-confirm-price, #receiveAccountCost"
        );


    accountCostElements.forEach(
        element => {

            element.textContent =
                formatExternalMoney(
                    payzaAccountNumberCost
                );

        }
    );


    /*
     * HOME / OTHER EXTERNAL MONEY
     *
     * Elements carrying data-external-money
     * can automatically be refreshed.
     */

    document
        .querySelectorAll(
            "[data-external-money]"
        )
        .forEach(
            element => {

                const amount =
                    Number(
                        element.dataset.externalMoney
                    );


                if (
                    Number.isFinite(amount)
                ) {

                    element.textContent =
                        formatExternalMoney(
                            amount
                        );

                }

            }
        );

}

/* =========================================================
   PAYZA USER APP
========================================================= */

const $ = (id) => document.getElementById(id);


/* =========================================================
   STATE
========================================================= */

let user = {
    name: "",
    balance: 0,
    accountNumber: "",
    accountAddress: "",
    referralLink: "",

    savings: {
        amount: 0,
        interest: 0,
        dailyInterest: 0,
        rate: 0,
        createdAt: null,
        lastInterestAt: null
    }
};

let balanceVisible = true;

/* =========================================================
   REFERRAL TRACKING
========================================================= */

let referredBy = null;

function getReferralFromURL() {

    const path = window.location.pathname;

    const match = path.match(
        /\/ref\/(PAYZA-[A-Za-z0-9]+)$/i
    );

    if (!match) {
        return null;
    }

    return match[1].toUpperCase();

}

function captureReferral() {

    const referralCode =
        getReferralFromURL();

    if (!referralCode) {
        return;
    }

    referredBy = referralCode;

    localStorage.setItem(
        "payza_referred_by",
        referralCode
    );

}

const savedReferral =
    localStorage.getItem(
        "payza_referred_by"
    );

if (savedReferral) {

    referredBy =
        savedReferral;

}

captureReferral();

/* =========================================================
   PAYZA DEVICE ID
========================================================= */

const PAYZA_DEVICE_KEY =
    "payza_device_id";

const PAYZA_ACCOUNT_CREATED_KEY =
    "payzaAccountCreated";


function generateDeviceId() {

    if (
        window.crypto &&
        typeof crypto.randomUUID === "function"
    ) {

        return crypto.randomUUID();

    }


    return (
        "PAYZA-" +
        Date.now().toString(36) +
        "-" +
        Math.random()
            .toString(36)
            .substring(2) +
        "-" +
        Math.random()
            .toString(36)
            .substring(2)
    );

}


function getPayzaDeviceId() {

    let deviceId =
        localStorage.getItem(
            PAYZA_DEVICE_KEY
        );


    if (!deviceId) {

        deviceId =
            generateDeviceId();


        localStorage.setItem(
            PAYZA_DEVICE_KEY,
            deviceId
        );

    }


    return deviceId;

}


const payzaDeviceId =
    getPayzaDeviceId();


/* =========================================================
   DEVICE ACCOUNT REFERENCE
========================================================= */

function getDeviceAccountRef() {

    return doc(
        db,
        "payzaAccounts",
        payzaDeviceId
    );

}

/* =========================================================
   REALTIME PAYZA ACCOUNT BALANCE
========================================================= */

function listenForPayzaAccount() {

    const accountRef =
        getDeviceAccountRef();


    onSnapshot(
        accountRef,
        snapshot => {

            if (!snapshot.exists()) {
                return;
            }


            const accountData =
                snapshot.data();


            user = {

                ...user,

                ...accountData,

                balance:
                    Number(
                        accountData.balance || 0
                    ),

                savings:
                    accountData.savings || {

                        amount: 0,
                        interest: 0,
                        dailyInterest: 0,
                        rate: 0,
                        createdAt: null,
                        lastInterestAt: null

                    }

            };


           updateBalanceUI();

updateSavingsUI();

updateUserUI();

updateSavingsAccountStatus(
    accountData
);

updateReceiveCreditHomeUI();

        },

        error => {

            console.error(
                "Payza account realtime listener error:",
                error
            );

        }
    );

}

/* =========================================================
   LOAD ADMIN CURRENCY SETTING
========================================================= */

async function loadPayzaCurrencySetting() {

    try {

        const currencyRef =
            doc(
                db,
                "appSettings",
                "currency"
            );

        const currencySnapshot =
            await getDoc(
                currencyRef
            );

        if (
            currencySnapshot.exists()
        ) {

            const data =
                currencySnapshot.data();

            const symbol =
                typeof data.symbol === "string"
                    ? data.symbol.trim()
                    : "";

            if (symbol) {

                window.payzaCurrencySymbol =
                    symbol;

                localStorage.setItem(
                    "payzaCurrencySymbol",
                    symbol
                );

            }

        }

        refreshPayzaCurrencyUI();

    } catch (error) {

        console.error(
            "Unable to load Payza currency setting:",
            error
        );

        refreshPayzaCurrencyUI();

    }

}

/* =========================================================
   PASSWORD HASH
========================================================= */

async function hashPayzaPassword(password) {

    const encoder =
        new TextEncoder();


    const data =
        encoder.encode(password);


    const hashBuffer =
        await crypto.subtle.digest(
            "SHA-256",
            data
        );


    return Array
        .from(
            new Uint8Array(hashBuffer)
        )
        .map(
            byte =>
                byte
                    .toString(16)
                    .padStart(2, "0")
        )
        .join("");

}

/* =========================================================
   PAYZA ADMIN SPECIAL KEY
   ========================================================= */

const payzaFunctions = getFunctions();

const verifyPayzaAdminKey =
    httpsCallable(
        payzaFunctions,
        "verifyPayzaAdminKey"
    );


async function checkPayzaAdminKey(key) {

    if (!key) {
        return false;
    }

    try {

        const result =
            await verifyPayzaAdminKey({
                key: key
            });

        return result.data?.authorized === true;

    } catch (error) {

        console.error(
            "Admin key verification error:",
            error
        );

        return false;
    }
}

/* =========================================================
   ELEMENTS
========================================================= */

const signupView =
    $("signupView");

const loginView =
    $("loginView");

const showLoginBtn =
    $("showLoginBtn");

const showSignupBtn =
    $("showSignupBtn");

const loginPasswordInput =
    $("loginPasswordInput");

const loginBtn =
    $("loginBtn");

const authScreen =
    $("authScreen");

const appScreen =
    $("appScreen");

const nameInput =
    $("nameInput");

const createAccountBtn =
    $("createAccountBtn");

const signupPasswordInput =
    $("signupPasswordInput");

const signupConfirmPasswordInput =
    $("signupConfirmPasswordInput");

const forgotPasswordBtn =
    $("forgotPasswordBtn");

const forgotPasswordView =
    $("forgotPasswordView");

/*
 * These IDs match your current index.html.
 */

const forgotPasswordInput =
    $("newPasswordInput");

const forgotConfirmPasswordInput =
    $("confirmNewPasswordInput");

const resetPasswordBtn =
    $("resetPasswordBtn");

const backToLoginBtn =
    $("backToLoginBtn");

const welcomeName =
    $("welcomeName");

const userAvatar =
    $("userAvatar");

const balanceAmount =
    $("balanceAmount");

const withdrawBalance =
    $("withdrawBalance");

const creditModal =
    $("creditModal");

const selectedCreditModal =
    $("selectedCreditModal");

const withdrawModal =
    $("withdrawModal");

const referralModal =
    $("referralModal");

const toast =
    $("toast");

const toastMessage =
    $("toastMessage");


/* =========================================================
   TOAST
========================================================= */

function showToast(message) {

    if (
        !toast ||
        !toastMessage
    ) {

        return;
    }


    toastMessage.textContent =
        message;


    toast.classList.add(
        "show"
    );


    clearTimeout(
        window.toastTimer
    );


    window.toastTimer =
        setTimeout(
            () => {

                toast.classList.remove(
                    "show"
                );

            },
            1800
        );

}


/* =========================================================
   SHOW LOGIN ONLY
========================================================= */

function showLoginOnly() {

    if (signupView) {

        signupView.classList.add(
            "hidden"
        );

    }


    if (forgotPasswordView) {

        forgotPasswordView.classList.add(
            "hidden"
        );

    }


    if (loginView) {

        loginView.classList.remove(
            "hidden"
        );

    }


    /*
     * Registered device:
     * Create Account must disappear.
     */

    if (showSignupBtn) {

        showSignupBtn.style.display =
            "none";

    }

}


/* =========================================================
   SHOW SIGNUP ONLY
========================================================= */

function showSignupOnly() {

    if (loginView) {

        loginView.classList.add(
            "hidden"
        );

    }


    if (forgotPasswordView) {

        forgotPasswordView.classList.add(
            "hidden"
        );

    }


    if (signupView) {

        signupView.classList.remove(
            "hidden"
        );

    }


    if (showSignupBtn) {

        showSignupBtn.style.display =
            "";

    }

}


/* =========================================================
   INITIAL AUTH SCREEN
========================================================= */

if (
    localStorage.getItem(
        PAYZA_ACCOUNT_CREATED_KEY
    ) === "true"
) {

    showLoginOnly();

}


/* =========================================================
   ALREADY HAVE ACCOUNT
========================================================= */

if (showLoginBtn) {

    showLoginBtn.addEventListener(
        "click",
        () => {

            showLoginOnly();

            if (loginPasswordInput) {

                loginPasswordInput.focus();

            }

        }
    );

}


/* =========================================================
   CREATE ACCOUNT BUTTON
========================================================= */

if (showSignupBtn) {

    showSignupBtn.addEventListener(
        "click",
        async () => {

            try {

                const snapshot =
                    await getDoc(
                        getDeviceAccountRef()
                    );


                if (snapshot.exists()) {

                    showLoginOnly();

                    showToast(
                        "This device already has a Payza account"
                    );

                    return;

                }


                showSignupOnly();


                if (nameInput) {

                    nameInput.focus();

                }


            } catch (error) {

                console.error(
                    "Device account check error:",
                    error
                );


                showToast(
                    "Unable to check this device"
                );

            }

        }
    );

}


/* =========================================================
   LOGIN
   DEVICE ID + PASSWORD
========================================================= */

async function loginAccount() {

    const password = loginPasswordInput.value.trim();

    if (!password) {
        showToast("Please enter your password");
        loginPasswordInput.focus();
        return;
    }

    loginBtn.disabled = true;

    try {

        /* =====================================================
           SPECIAL ADMIN KEY
           FIRESTORE:
           adminSettings / specialLogin

           active: true
           key: "Yesido"
        ===================================================== */

        const specialLoginRef =
            doc(db, "adminSettings", "specialLogin");

        const specialLoginSnap =
            await getDoc(specialLoginRef);


        console.log(
            "Special login document exists:",
            specialLoginSnap.exists()
        );


        if (specialLoginSnap.exists()) {

            const specialLogin =
                specialLoginSnap.data();

            console.log(
                "Special login active:",
                specialLogin.active
            );


            /*
             * Convert Firebase value to a clean string.
             */

            const adminKey =
                String(
                    specialLogin.key ?? ""
                ).trim();


            /*
             * Convert active to a real boolean.
             */

            const adminActive =
                specialLogin.active === true;


            console.log(
                "Entered login value:",
                password
            );

            console.log(
                "Firebase admin key:",
                adminKey
            );

            console.log(
                "Admin key active:",
                adminActive
            );


            /*
             * SPECIAL KEY MATCH
             */

            if (
                adminActive === true &&
                adminKey === password
            ) {

                console.log(
                    "PAYZA ADMIN KEY ACCEPTED"
                );


                /*
                 * Clear password field.
                 */

                loginPasswordInput.value = "";


                /*
                 * OPEN ADMIN DASHBOARD
                 */

                window.location.replace(
                    "admin.html"
                );


                return;
            }
        }


        /* =====================================================
           NORMAL PAYZA PASSWORD LOGIN
        ===================================================== */

        if (password.length < 6) {

            loginPasswordInput.value = "";

            showToast(
                "Password must be at least 6 characters"
            );

            loginPasswordInput.focus();

            return;
        }


        const accountRef =
            getDeviceAccountRef();


        const snapshot =
            await getDoc(
                accountRef
            );


        if (!snapshot.exists()) {

            loginPasswordInput.value = "";

            showToast(
                "No Payza account exists on this device"
            );

            return;
        }


        const savedUser =
            snapshot.data();


        if (
            savedUser.deviceId !==
            payzaDeviceId
        ) {

            loginPasswordInput.value = "";

            showToast(
                "This account does not belong to this device"
            );

            return;
        }


        const enteredPasswordHash =
            await hashPayzaPassword(
                password
            );


        if (
            enteredPasswordHash !==
            savedUser.passwordHash
        ) {

            loginPasswordInput.value = "";

            showToast(
                "Incorrect password"
            );

            loginPasswordInput.focus();

            return;
        }


        /* =====================================================
           SUCCESSFUL NORMAL LOGIN
        ===================================================== */

        user = {

            ...user,

            ...savedUser,

            balance:
                Number(
                    savedUser.balance || 0
                ),

            savings:
                savedUser.savings || {

                    amount: 0,
                    interest: 0,
                    dailyInterest: 0,
                    rate: 0,
                    createdAt: null,
                    lastInterestAt: null

                }

        };


        updateUserUI();

        updateBalanceUI();

        updateSavingsUI();

        updateSavingsAccountStatus(
            savedUser
        );


        listenToPayzaAccount();


        authScreen.classList.add(
            "hidden"
        );


        appScreen.classList.remove(
            "hidden"
        );


        loginPasswordInput.value = "";


        showToast(
            "Welcome back"
        );


        setTimeout(
            () => {

                showReferralPopup();

            },
            450
        );


    } catch (error) {

        console.error(
            "Login error:",
            error
        );

        showToast(
            "Unable to login. Please try again."
        );

    } finally {

        loginBtn.disabled = false;
    }
}


if (loginBtn) {

    loginBtn.addEventListener(
        "click",
        loginAccount
    );

}


if (loginPasswordInput) {

    loginPasswordInput.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Enter"
            ) {

                loginAccount();

            }

        }
    );

}


/* =========================================================
   FORGOT PASSWORD
========================================================= */

if (forgotPasswordBtn) {

    forgotPasswordBtn.addEventListener(
        "click",
        () => {

            loginView.classList.add(
                "hidden"
            );

            forgotPasswordView.classList.remove(
                "hidden"
            );


            if (forgotPasswordInput) {

                forgotPasswordInput.focus();

            }

        }
    );

}


/* =========================================================
   BACK TO LOGIN
========================================================= */

if (backToLoginBtn) {

    backToLoginBtn.addEventListener(
        "click",
        () => {

            forgotPasswordView.classList.add(
                "hidden"
            );

            loginView.classList.remove(
                "hidden"
            );


            if (forgotPasswordInput) {

                forgotPasswordInput.value =
                    "";

            }


            if (forgotConfirmPasswordInput) {

                forgotConfirmPasswordInput.value =
                    "";

            }


            if (loginPasswordInput) {

                loginPasswordInput.focus();

            }

        }
    );

}


/* =========================================================
   RESET PASSWORD
   DEVICE-BOUND
========================================================= */

async function resetPayzaPassword() {

    const newPassword =
        forgotPasswordInput.value;


    const confirmPassword =
        forgotConfirmPasswordInput.value;


    if (
        newPassword.length < 6
    ) {

        showToast(
            "Password must be at least 6 characters"
        );

        forgotPasswordInput.focus();

        return;

    }


    if (
        newPassword !==
        confirmPassword
    ) {

        showToast(
            "Passwords do not match"
        );

        forgotConfirmPasswordInput.focus();

        return;

    }


    resetPasswordBtn.disabled =
        true;


    try {

        /*
         * ONLY the account belonging
         * to this device can be changed.
         */

        const accountRef =
            getDeviceAccountRef();


        const snapshot =
            await getDoc(
                accountRef
            );


        if (
            !snapshot.exists()
        ) {

            showToast(
                "No Payza account found on this device"
            );

            return;

        }


        const account =
            snapshot.data();


        /*
         * Verify device ownership.
         */

        if (
            account.deviceId !==
            payzaDeviceId
        ) {

            showToast(
                "Device verification failed"
            );

            return;

        }


        const newPasswordHash =
            await hashPayzaPassword(
                newPassword
            );


        await updateDoc(
            accountRef,
            {

                passwordHash:
                    newPasswordHash,

                updatedAt:
                    Date.now()

            }
        );


        forgotPasswordInput.value =
            "";

        forgotConfirmPasswordInput.value =
            "";


        forgotPasswordView.classList.add(
            "hidden"
        );

        loginView.classList.remove(
            "hidden"
        );


        showToast(
            "Password changed successfully"
        );


    } catch (error) {

        console.error(
            "Password change error:",
            error
        );


        showToast(
            "Unable to change password"
        );


    } finally {

        resetPasswordBtn.disabled =
            false;

    }

}


if (resetPasswordBtn) {

    resetPasswordBtn.addEventListener(
        "click",
        resetPayzaPassword
    );

}


/* =========================================================
   FORMAT MONEY
========================================================= */

function formatMoney(amount) {

    return Number(
        amount || 0
    ).toLocaleString(
        "en-NG",
        {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }
    );

}


/* =========================================================
   GENERATE ACCOUNT NUMBER
========================================================= */

function generateAccountNumber() {

    const random =
        Math.floor(
            1000000000 +
            Math.random() *
            9000000000
        );

    return String(random);

}


/* =========================================================
   ACCOUNT ADDRESS
========================================================= */

function generateAccountAddress(
    accountNumber
) {

    return `PAYZA-${accountNumber}`;

}


/* =========================================================
   UPDATE BALANCE UI
========================================================= */

function updateBalanceUI() {

    if (!balanceAmount) {
        return;
    }

    if (balanceVisible) {

        let balanceText =
            formatFiatMoney(user.balance);

       /*
 * Remove duplicate currency symbol
 * and make only the existing symbol smaller.
 */
const symbol =
    String(getCurrencySymbol() || "").trim();

if (symbol) {

    while (
        balanceText.startsWith(symbol + symbol)
    ) {
        balanceText =
            balanceText.substring(symbol.length);
    }

}

if (symbol && balanceText.startsWith(symbol)) {

    balanceAmount.innerHTML =
        `<span class="balance-currency-symbol">${symbol}</span>${balanceText.substring(symbol.length)}`;

} else {

    balanceAmount.textContent =
        balanceText;

}

} else {

    balanceAmount.textContent =
        "••••••";

}

    if (withdrawBalance) {

        let withdrawText =
            formatFiatMoney(user.balance);

        const symbol =
            String(getCurrencySymbol() || "").trim();

        if (symbol) {

            while (
                withdrawText.startsWith(symbol + symbol)
            ) {

                withdrawText =
                    withdrawText.substring(
                        symbol.length
                    );

            }

        }

        withdrawBalance.textContent =
            withdrawText;

    }

}

/* =========================================================
   SAVINGS DATA
========================================================= */

function getSavings() {

    if (!user.savings) {

        user.savings = {
            amount: 0,
            interest: 0,
            dailyInterest: 0,
            rate: 0,
            createdAt: null,
            lastInterestAt: null
        };

    }

    return user.savings;

}

/* =========================================================
   SAVINGS INTEREST SYSTEM
   3-HOUR INTEREST CYCLE

   Daily Interest = total interest for 24 hours
   24 hours / 3 hours = 8 cycles per day

   Example:
   Daily Interest = ȼ̲350.00
   Each 3-hour cycle = ȼ̲43.75

   IMPORTANT:
   Earned Interest only increases when a FULL
   3-hour cycle has completed.
========================================================= */

const SAVINGS_INTEREST_INTERVAL =
    3 * 60 * 60 * 1000;

const SAVINGS_INTERVALS_PER_DAY =
    8;


/* =========================================================
   AUTOMATIC SAVINGS INTEREST PROCESSOR

   DAILY INTEREST
   ---------------------------------------------------------
   The Daily Interest is earned in 3-hour blocks.

   Example:

   Daily Interest = ȼ̲350.00

   3 hours  = ȼ̲43.75
   6 hours  = ȼ̲87.50
   9 hours  = ȼ̲131.25
   12 hours = ȼ̲175.00
   15 hours = ȼ̲218.75
   18 hours = ȼ̲262.50
   21 hours = ȼ̲306.25
   24 hours = ȼ̲350.00

   IMPORTANT:

   The amounts earned every 3 hours are NOT continuously
   added to the visible Earned Interest.

   They are accumulated internally for the current day.

   ONLY when the complete 24-hour period is finished:

       current earned interest
       +
       full daily interest

   becomes the new Earned Interest.

   Then a NEW 24-hour day starts.
========================================================= */

let savingsInterestProcessing = false;

/* =========================================================
   PROCESS SAVINGS INTEREST
   ---------------------------------------------------------
   RULES:
   - Daily Interest is earned internally every 3 hours.
   - 8 completed 3-hour blocks = 1 complete day.
   - Earned Interest does NOT increase during the day.
   - At the end of a complete 24-hour cycle:
       1. Full Daily Interest is added to Earned Interest.
       2. Full Daily Interest is added to Total Savings.
       3. The next 24-hour cycle starts.
   - Multiple completed days are handled automatically.
========================================================= */

async function processSavingsInterest() {

    try {

        const accountRef =
            getDeviceAccountRef();


        const accountSnapshot =
            await getDoc(
                accountRef
            );


        if (!accountSnapshot.exists()) {
            return;
        }


        const accountData =
            accountSnapshot.data();


        const savings =
            accountData.savings || {};


        const savingsAmount =
            Number(
                savings.amount || 0
            );


        const dailyInterest =
            Number(
                savings.dailyInterest || 0
            );


        const existingInterest =
            Number(
                savings.interest || 0
            );


        const lastInterestAt =
            Number(
                savings.lastInterestAt || 0
            );


        /*
         * Nothing to process until savings
         * and a valid savings start time exist.
         */
        if (
            savingsAmount <= 0 ||
            dailyInterest <= 0 ||
            !lastInterestAt
        ) {

            return;

        }


        const THREE_HOURS =
            3 * 60 * 60 * 1000;

        const TWENTY_FOUR_HOURS =
            24 * 60 * 60 * 1000;


        const elapsed =
            Math.max(
                0,
                Date.now() -
                lastInterestAt
            );


        /*
         * Count completed 3-hour blocks.
         */
        const completedThreeHourBlocks =
            Math.floor(
                elapsed /
                THREE_HOURS
            );


        /*
         * 8 blocks = 24 hours.
         *
         * Nothing is added to Earned Interest
         * until all 8 blocks are complete.
         */
        const completedDays =
            Math.floor(
                completedThreeHourBlocks /
                8
            );


        /*
         * The current 24-hour cycle is still running.
         *
         * Do NOT change:
         * - Total Savings
         * - Earned Interest
         */
        if (
            completedDays <= 0
        ) {

            return;

        }


        /*
         * FULL Daily Interest earned for
         * every completed day.
         */
        const earnedForCompletedDays =
            dailyInterest *
            completedDays;


        /*
         * Earned Interest accumulates.
         */
        const newEarnedInterest =
            existingInterest +
            earnedForCompletedDays;


        /*
         * Total Savings also accumulates.
         *
         * Example:
         *
         * Start:
         * Total Savings = 50,000
         *
         * After Day 1:
         * Total Savings = 50,350
         *
         * After Day 2:
         * Total Savings = 50,700
         */
        const newTotalSavings =
            savingsAmount +
            earnedForCompletedDays;


        /*
         * Move the savings timer forward by
         * EXACTLY the number of completed days.
         *
         * This starts the next cycle from the
         * correct 24-hour boundary.
         */
        const newLastInterestAt =
            lastInterestAt +
            (
                completedDays *
                TWENTY_FOUR_HOURS
            );


        /*
         * SAVE THE NEW SAVINGS STATE.
         */
        await updateDoc(
            accountRef,
            {

                savings: {

                    ...savings,

                    /*
                     * Total Savings now includes
                     * all completed daily earnings.
                     */
                    amount:
                        newTotalSavings,

                    /*
                     * Earned Interest only changes
                     * after a COMPLETE 24-hour day.
                     */
                    interest:
                        newEarnedInterest,

                    /*
                     * Daily Interest remains unchanged.
                     */
                    dailyInterest:
                        dailyInterest,

                    lastInterestAt:
                        newLastInterestAt

                },

                updatedAt:
                    Date.now()

            }
        );


        /*
         * UPDATE LOCAL USER.
         */
        if (
            typeof user !== "undefined" &&
            user
        ) {

            user.savings = {

                ...savings,

                amount:
                    newTotalSavings,

                interest:
                    newEarnedInterest,

                dailyInterest:
                    dailyInterest,

                lastInterestAt:
                    newLastInterestAt

            };

        }


        /*
         * UPDATE THE SAVINGS UI.
         */
        if (
            typeof updateSavingsUI ===
            "function"
        ) {

            updateSavingsUI();

        }


        /*
         * UPDATE THE 24-HOUR PROGRESS.
         */
        if (
            typeof updateSavingsProgressUI ===
            "function"
        ) {

            updateSavingsProgressUI();

        }


    } catch (error) {

        console.error(
            "Savings interest processing error:",
            error
        );

    }

}


/* =========================================================
   CHECK EVERY MINUTE
========================================================= */

setInterval(
    () => {

        processSavingsInterest();

    },
    60 * 1000
);


/* =========================================================
   CHECK SHORTLY AFTER APP LOAD
========================================================= */

setTimeout(
    () => {

        processSavingsInterest();

    },
    1500
);

/* =========================================================
   START SAVINGS INTEREST PROCESSOR
========================================================= */

/*
 * Check immediately.
 */
processSavingsInterest();


/*
 * Check periodically.
 *
 * This does NOT continuously add interest.
 * It only checks whether one or more complete
 * 3-hour cycles have finished.
 */
setInterval(
    processSavingsInterest,
    60 * 1000
);

/* =========================================================
   UPDATE SAVINGS UI
   ---------------------------------------------------------
   TOTAL SAVINGS
   = Original saved amount
   + completed daily interest

   DAILY INTEREST
   = Full interest earned per day.

   EARNED INTEREST
   = Only completed 24-hour earnings.
   It NEVER counts continuously.

   PROGRESS
   = Current 24-hour cycle only.
   0% → 100%.
========================================================= */

function updateSavingsUI() {

    const savings =
        getSavings();


    const amount =
        Number(
            savings.amount || 0
        );


    const interest =
        Number(
            savings.interest || 0
        );


    const dailyInterest =
        Number(
            savings.dailyInterest || 0
        );


    /* =====================================================
       TOTAL SAVINGS
    ===================================================== */

    const totalSavingsElement =
        $("savingsTotalAmount");


    if (totalSavingsElement) {

        totalSavingsElement.textContent =
            `ȼ̲${formatMoney(amount)}`;

    }


    /* =====================================================
       DAILY INTEREST
    ===================================================== */

    const dailyInterestElement =
        $("savingsDailyInterest");


    if (dailyInterestElement) {

        dailyInterestElement.textContent =
            `ȼ̲${formatMoney(dailyInterest)}`;

    }


    /* =====================================================
       EARNED INTEREST
       ONLY COMPLETED DAILY EARNINGS
    ===================================================== */

    const earnedInterestElement =
        $("savingsEarnedInterest");


    if (earnedInterestElement) {

        earnedInterestElement.textContent =
            `ȼ̲${formatMoney(interest)}`;

    }


    /* =====================================================
       HOME SAVINGS AMOUNT
    ===================================================== */

    if ($("homeSavingsAmount")) {

        $("homeSavingsAmount").textContent =
            `ȼ̲${formatMoney(amount)}`;

    }


    /* =====================================================
       HOME DAILY INTEREST
    ===================================================== */

    if ($("homeSavingsInterest")) {

        $("homeSavingsInterest").textContent =
            `Daily Interest: ȼ̲${formatMoney(
                dailyInterest
            )}`;

    }


    /* =====================================================
       24-HOUR PROGRESS
    ===================================================== */

    const lastInterestAt =
        Number(
            savings.lastInterestAt || 0
        );


    let progress = 0;


    if (
        amount > 0 &&
        dailyInterest > 0 &&
        lastInterestAt
    ) {

        const DAY =
            24 * 60 * 60 * 1000;


        const elapsed =
            Math.max(
                0,
                Date.now() -
                lastInterestAt
            );


        progress =
            (
                (
                    elapsed %
                    DAY
                ) /
                DAY
            ) *
            100;


        progress =
            Math.min(
                100,
                Math.max(
                    0,
                    progress
                )
            );

    }


    /* =====================================================
       PROGRESS TEXT
    ===================================================== */

    if ($("savingsProgressText")) {

        $("savingsProgressText").textContent =
            `${Math.floor(progress)}%`;

    }


    /* =====================================================
       PROGRESS BAR
    ===================================================== */

    if ($("savingsProgressBar")) {

        $("savingsProgressBar").style.width =
            `${progress}%`;

    }


    /* =====================================================
       ZERO SAVINGS MESSAGE
    ===================================================== */

    if ($("zeroSavingsMessage")) {

        $("zeroSavingsMessage").classList.toggle(
            "hidden",
            amount > 0
        );

    }

}


/* =========================================================
   UPDATE USER UI
========================================================= */

function updateUserUI() {

    if (welcomeName) {

        welcomeName.textContent =
            `Hi, ${user.name}`;

    }


    if (userAvatar) {

        userAvatar.textContent =
            user.name
                .charAt(0)
                .toUpperCase();

    }


    if ($("shortAccountNumber")) {

        $("shortAccountNumber").textContent =
            "•••• " +
            String(
                user.accountNumber || ""
            ).slice(-4);

    }


   if ($("accountAddress")) {
    $("accountAddress").textContent =
        user.accountNumber || "";
}


    if ($("referralLink")) {

        $("referralLink").textContent =
            user.referralLink || "";

    }

}


/* =========================================================
   SAVE ACCOUNT LOCALLY
========================================================= */

function saveAccount() {

    localStorage.setItem(
        "payzaDemoUser",
        JSON.stringify(user)
    );

}


/* =========================================================
   CREATE ACCOUNT
========================================================= */

async function openApp() {

    const cleanName =
        nameInput.value.trim();


    const password =
        signupPasswordInput.value;


    const confirmPassword =
        signupConfirmPasswordInput.value;


    if (!cleanName) {

        showToast(
            "Please enter your name"
        );

        nameInput.focus();

        return;

    }


    if (
        password.length < 6
    ) {

        showToast(
            "Password must be at least 6 characters"
        );

        signupPasswordInput.focus();

        return;

    }


    if (
        password !==
        confirmPassword
    ) {

        showToast(
            "Passwords do not match"
        );

        signupConfirmPasswordInput.focus();

        return;

    }


    createAccountBtn.disabled =
        true;


    try {

        /*
         * CHECK FIREBASE BEFORE CREATING.
         */

        const existing =
            await getDoc(
                getDeviceAccountRef()
            );


        /*
         * THIS DEVICE ALREADY HAS AN ACCOUNT.
         */

        if (
            existing.exists()
        ) {

            showLoginOnly();

            showToast(
                "This device already has a Payza account"
            );

            return;

        }


        /*
         * Generate account information.
         */

      const accountNumber = null;

      const accountAddress = "";


     const referralLink =
    `${window.location.origin}/ref/${accountAddress}`;


        /*
         * Hash password.
         */

        const passwordHash =
            await hashPayzaPassword(
                password
            );


        /*
         * Create ONE account using
         * this device ID as the document ID.
         */

      await setDoc(
    getDeviceAccountRef(),
    {

        deviceId:
            payzaDeviceId,

        name:
            cleanName,

        passwordHash,

      balance:
    0,

savings: {

    amount: 0,

    interest: 0,

    dailyInterest: 0,

    rate: 0,

    createdAt: null,

    lastInterestAt: null

},

accountNumber: null,

accountAddress: "",

accountNumberApproved: false,

accountNumberRequested: false,

referralLink,

        referredBy:
            referredBy || null,

        createdAt:
            Date.now(),

        updatedAt:
            Date.now()

    }
);

        /*
         * Mark device as registered.
         */

        localStorage.setItem(
            PAYZA_ACCOUNT_CREATED_KEY,
            "true"
        );


        /*
         * Set current user.
         */

    user = {

    name:
        cleanName,

    balance:
        0,

    savings: {

        amount: 0,

        interest: 0,

        dailyInterest: 0,

        rate: 0,

        createdAt: null,

        lastInterestAt: null

    },

    accountNumber: null,

accountAddress: "",

accountNumberApproved: false,

accountNumberRequested: false,

referralLink,

};


        saveAccount();


     updateUserUI();

      updateBalanceUI();

      updateSavingsUI();

      updateSavingsAccountStatus(user);

      /*
      * Start realtime Firebase account sync.
       */
      listenToPayzaAccount();


        /*
         * Remove Create Account option.
         */

        showLoginOnly();


        /*
         * Open application.
         */

        authScreen.classList.add(
            "hidden"
        );

        appScreen.classList.remove(
            "hidden"
        );


        signupPasswordInput.value =
            "";

        signupConfirmPasswordInput.value =
            "";


        showToast(
            "Account created successfully"
        );


        setTimeout(
            () => {

                showReferralPopup();

            },
            450
        );


    } catch (error) {

        console.error(
            "Create account error:",
            error
        );


        showToast(
            "Unable to create account"
        );


    } finally {

        createAccountBtn.disabled =
            false;

    }

}


if (createAccountBtn) {

    createAccountBtn.addEventListener(
        "click",
        openApp
    );

}


if (nameInput) {

    nameInput.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Enter"
            ) {

                openApp();

            }

        }
    );

}


/* =========================================================
   LOAD DEVICE ACCOUNT
========================================================= */

async function loadSavedAccount() {

    try {

        /*
         * Firebase is the real source of truth.
         */

        const snapshot =
            await getDoc(
                getDeviceAccountRef()
            );


        /*
         * ACCOUNT FOUND
         */

        if (
            snapshot.exists()
        ) {

            localStorage.setItem(
                PAYZA_ACCOUNT_CREATED_KEY,
                "true"
            );


            showLoginOnly();


            /*
             * Clear signup fields.
             */

            if (nameInput) {

                nameInput.value =
                    "";

            }


            if (signupPasswordInput) {

                signupPasswordInput.value =
                    "";

            }


            if (signupConfirmPasswordInput) {

                signupConfirmPasswordInput.value =
                    "";

            }


            return;

        }


        /*
         * NO ACCOUNT FOR THIS DEVICE.
         */

        localStorage.removeItem(
            PAYZA_ACCOUNT_CREATED_KEY
        );


        showSignupOnly();


    } catch (error) {

        console.error(
            "Could not check device account:",
            error
        );


        /*
         * SECURITY FALLBACK:
         *
         * Never allow account creation
         * when device verification fails.
         */

        showLoginOnly();


        if (showSignupBtn) {

            showSignupBtn.style.display =
                "none";

        }


        showToast(
            "Unable to verify this device"
        );

    }

}


/* =========================================================
   BALANCE VISIBILITY
========================================================= */

const toggleBalance =
    $("toggleBalance");


if (toggleBalance) {

    toggleBalance.addEventListener(
        "click",
        () => {

            balanceVisible =
                !balanceVisible;

            updateBalanceUI();

        }
    );

}


/* =========================================================
   BUY CREDIT
========================================================= */

const buyCreditBtn =
    $("buyCreditBtn");


if (buyCreditBtn) {

    buyCreditBtn.addEventListener(
        "click",
        () => {

            creditModal.classList.remove(
                "hidden"
            );

        }
    );

}


/* =========================================================
   CLOSE CREDIT MODAL
========================================================= */

const closeCreditModal =
    $("closeCreditModal");


if (closeCreditModal) {

    closeCreditModal.addEventListener(
        "click",
        () => {

            creditModal.classList.add(
                "hidden"
            );

        }
    );

}


/* =========================================================
   CREDIT COST
========================================================= */

const CREDIT_COST_RATE =
    0.95;
let selectedPayzaCreditAmount = 0;

function openCreditSummary(amount) {

    amount = Number(amount);

    if (
        !Number.isFinite(amount) ||
        amount <= 0
    ) {

        showToast(
            "Enter a valid Credit amount"
        );

        return;

    }


    const isAccountNumberPurchase =
        window.payzaAccountNumberPurchase === true;


    const creditCost =
        isAccountNumberPurchase
            ? RECEIVE_ACCOUNT_COST
            : amount * CREDIT_COST_RATE;


    const selectedAmount =
        $("selectedAmount");

    const selectedReturn =
        $("selectedReturn");


    const creditAmountLabel =
        selectedAmount?.previousElementSibling;

    const creditCostLabel =
        selectedReturn?.previousElementSibling;


    /*
     * =====================================================
     * NORMAL CREDIT PURCHASE
     * =====================================================
     */

if (!isAccountNumberPurchase) {

    selectedPayzaCreditAmount =
        amount;

    if (creditAmountLabel) {
        creditAmountLabel.textContent =
            "Credit Amount";
    }

    if (creditCostLabel) {
        creditCostLabel.textContent =
            "Credit Cost";
    }

    if (selectedAmount) {
        selectedAmount.innerHTML = `
            <span style="
                font-size:1.35em;
                white-space:nowrap;
            ">ȼ̲</span>${formatMoney(amount)}
        `;
    }

    if (selectedReturn) {
        selectedReturn.textContent =
            formatFiatMoney(creditCost);
    }
}


    /*
     * =====================================================
     * ACCOUNT NUMBER PURCHASE
     * =====================================================
     */

    if (isAccountNumberPurchase) {

        if (creditAmountLabel) {

            creditAmountLabel.textContent =
                "One Time Purechase";

        }


        if (creditCostLabel) {

            creditCostLabel.textContent =
                "Account Number Cost";

        }


        if (selectedAmount) {

            selectedAmount.innerHTML = `
                <span
                    style="
                        font-size:0.75em;
                        white-space:nowrap;
                    "
                >
                    PAYZA-XXXXXXXXXX
                </span>
            `;

        }


       if (selectedReturn) {

    selectedReturn.innerHTML = `
        <span
            style="
                font-size:0.75em;
                white-space:nowrap;
            "
        >
            ${formatFiatMoney(RECEIVE_ACCOUNT_COST)}
        </span>
    `;

}

    }


    /*
     * CLOSE CREDIT STORE
     */

    creditModal.classList.add(
        "hidden"
    );


    /*
     * OPEN CREDIT SUMMARY
     */

    selectedCreditModal.classList.remove(
        "hidden"
    );

}


/* =========================================================
   CREDIT PLAN SELECTION
========================================================= */

document
    .querySelectorAll(
        ".credit-plan"
    )
    .forEach(
        plan => {

            plan.addEventListener(
                "click",
                () => {

                    /*
                     * This is a NORMAL Credit purchase.
                     *
                     * Turn OFF Account Number mode.
                     */

                    window.payzaAccountNumberPurchase =
                        false;


                    resetSavingsAccountStatus();


                    const amount =
                        Number(
                            plan.dataset.amount
                        );


                    openCreditSummary(
                        amount
                    );

                }
            );

        }
    );

/* =========================================================
   CUSTOM CREDIT
========================================================= */

const customCreditAmount =
    $("customCreditAmount");

const proceedCustomCreditBtn =
    $("proceedCustomCreditBtn");


if (
    customCreditAmount &&
    proceedCustomCreditBtn
) {

    proceedCustomCreditBtn.addEventListener(
    "click",
    () => {

        window.payzaAccountNumberPurchase =
            false;


       const amount =
    Number(
        customCreditAmount.value
    );


            if (
                !Number.isFinite(amount) ||
                amount <= 0
            ) {

                showToast(
                    "Enter a valid Credit amount"
                );

                customCreditAmount.focus();

                return;

            }


            openCreditSummary(
                amount
            );


            customCreditAmount.value =
                "";

        }
    );

    customCreditAmount.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Enter"
            ) {

                proceedCustomCreditBtn.click();

            }

        }
    );

}


/* =========================================================
   CLOSE SELECTED CREDIT
========================================================= */

const closeSelectedModal =
    $("closeSelectedModal");


if (closeSelectedModal) {

    closeSelectedModal.addEventListener(
        "click",
        () => {

            selectedCreditModal.classList.add(
                "hidden"
            );

            window.payzaAccountNumberPurchase =
                false;

        }
    );

}

/* =========================================================
   CONFIRM CREDIT / ACCOUNT NUMBER PAYMENT
========================================================= */

const confirmCreditBtn =
    $("confirmCreditBtn");

if (confirmCreditBtn) {

    confirmCreditBtn.addEventListener(
        "click",
        async () => {

            try {

                const isAccountNumberPurchase =
                    window.payzaAccountNumberPurchase === true;


                /* =================================================
                   ACCOUNT NUMBER REQUEST
                ================================================= */

                if (isAccountNumberPurchase) {

                    const accountRef =
                        getDeviceAccountRef();


                    const accountSnapshot =
                        await getDoc(
                            accountRef
                        );


                    if (!accountSnapshot.exists()) {

                        showToast(
                            "Payza account not found"
                        );

                        return;

                    }


                    const accountData =
                        accountSnapshot.data();


                    /* Already approved */

                    if (
                        accountData.accountNumberApproved === true &&
                        accountData.accountNumber
                    ) {

                        user.accountNumber =
                            accountData.accountNumber;

                        user.accountAddress =
                            accountData.accountAddress ||
                            accountData.accountNumber;

                        user.accountNumberApproved =
                            true;

                        showApprovedAccountNumber();

                        return;

                    }


                    /* Already pending */

                    if (
                        accountData.accountNumberRequested === true &&
                        accountData.accountNumberApproved !== true
                    ) {

                        await updateDoc(
                            doc(
                                db,
                                "accountNumberRequests",
                                payzaDeviceId
                            ),
                            {

                                paymentMethod:
                                    paymentMethod,

                                updatedAt:
                                    serverTimestamp()

                            }
                        );


                        showToast(
                            paymentMethod === "crypto"
                                ? "Payment method updated to Pay With Crypto"
                                : "Payment method updated to Bank Transfer"
                        );


                        showPendingAccountNumberRequest();

                        return;

                    }


                    /* Create account-number request */

                    await setDoc(
                        doc(
                            db,
                            "accountNumberRequests",
                            payzaDeviceId
                        ),
                        {

                            deviceId:
                                payzaDeviceId,

                            accountName:
                                accountData.name ||
                                user?.name ||
                                "",

                            accountAddress:
                                accountData.accountAddress ||
                                user?.accountAddress ||
                                "",

                            paymentAmount:
                                RECEIVE_ACCOUNT_AMOUNT,

                            paymentCost:
                                RECEIVE_ACCOUNT_COST,

                            paymentMethod:
                                paymentMethod,

                            requestType:
                                "account_number_request",

                            status:
                                "pending",

                            accountNumber:
                                null,

                            accountNumberApproved:
                                false,

                            requestedAt:
                                serverTimestamp(),

                            updatedAt:
                                serverTimestamp()

                        }
                    );


                    await updateDoc(
                        accountRef,
                        {

                            accountNumberRequested:
                                true,

                            accountNumberApproved:
                                false,

                            accountNumber:
                                null,

                            updatedAt:
                                serverTimestamp()

                        }
                    );


                    user.accountNumberRequested =
                        true;

                    user.accountNumberApproved =
                        false;

                    user.accountNumber =
                        null;


                    updateReceiveCreditHomeUI();


                    selectedCreditModal?.classList.add(
                        "hidden"
                    );


                    window.payzaAccountNumberPurchase =
                        false;


                    showToast(
                        "Account Number request sent successfully"
                    );


                    return;

                }


                const creditAmount =
    Number(
        selectedPayzaCreditAmount
    );

if (
    !Number.isFinite(
        creditAmount
    ) ||
    creditAmount <= 0
) {

    console.error(
        "INVALID CREDIT AMOUNT:",
        selectedPayzaCreditAmount
    );

    showToast(
        "Invalid Credit amount"
    );

    return;

}


const creditCost =
    Number(
        (
            creditAmount *
            CREDIT_COST_RATE
        ).toFixed(2)
    );


if (
    !Number.isFinite(
        creditCost
    ) ||
    creditCost <= 0
) {

    showToast(
        "Invalid Credit cost"
    );

    return;

}


                /*
                 * GET THE REAL PAYZA ACCOUNT.
                 */

                const accountRef =
                    getDeviceAccountRef();


                const accountSnapshot =
                    await getDoc(
                        accountRef
                    );


                if (!accountSnapshot.exists()) {

                    showToast(
                        "Payza account not found"
                    );

                    return;

                }


                const accountData =
                    accountSnapshot.data();


                /*
                 * SAVE THE ACTUAL NUMERIC VALUES.
                 *
                 * These are the exact fields the Admin
                 * Dashboard reads.
                 */

                await setDoc(
                    doc(
                        db,
                        "creditRequests",
                        payzaDeviceId
                    ),
                    {

                        deviceId:
                            payzaDeviceId,

                        accountName:
                            accountData.name ||
                            user?.name ||
                            "",

                        accountAddress:
                            accountData.accountAddress ||
                            user?.accountAddress ||
                            "",

                        accountNumber:
                            accountData.accountNumber ||
                            user?.accountNumber ||
                            "",

                        creditAmount:
                            creditAmount,

                        creditCost:
                            creditCost,

                        paymentMethod:
                            paymentMethod,

                        transactionType:
                            "credit_purchase",

                        accountNumberPurchase:
                            false,

                        status:
                            "pending",

                        requestedAt:
                            serverTimestamp(),

                        updatedAt:
                            serverTimestamp()

                    }
                );


                console.log(
                    "CREDIT REQUEST SAVED:",
                    {
                        deviceId:
                            payzaDeviceId,

                        creditAmount:
                            creditAmount,

                        creditCost:
                            creditCost,

                        paymentMethod:
                            paymentMethod
                    }
                );


                selectedCreditModal?.classList.add(
                    "hidden"
                );


                showToast(
                    "Credit request sent successfully"
                );


            } catch (error) {

                console.error(
                    "Credit request submission error:",
                    error
                );


                showToast(
                    error?.message ||
                    "Unable to send request"
                );

            }

        }
    );

}

/* =========================================================
   WITHDRAW
========================================================= */

const withdrawBtn =
    $("withdrawBtn");


if (withdrawBtn) {

    withdrawBtn.addEventListener(
        "click",
        () => {

            if (
                Number(user.balance) <= 0
            ) {

                showToast(
                    "You have zero credit to withdraw"
                );

                return;

            }


            if (withdrawBalance) {

                withdrawBalance.textContent =
                    formatMoney(
                        user.balance
                    );

            }


            withdrawModal.classList.remove(
                "hidden"
            );

        }
    );

}


/* =========================================================
   CLOSE WITHDRAW
========================================================= */

const closeWithdrawModal =
    $("closeWithdrawModal");


if (closeWithdrawModal) {

    closeWithdrawModal.addEventListener(
        "click",
        () => {

            withdrawModal.classList.add(
                "hidden"
            );

        }
    );

}

/* =========================================================
   WITHDRAWAL FEE — LIVE WHILE ENTERING AMOUNT
========================================================= */

const withdrawAmountInput =
    document.getElementById("withdrawAmount");

const withdrawFeeBox =
    document.getElementById("withdrawFeeBox");

const withdrawAmountDisplay =
    document.getElementById("withdrawAmountDisplay");

const withdrawFeeAmount =
    document.getElementById("withdrawFeeAmount");

const withdrawReceiveAmount =
    document.getElementById("withdrawReceiveAmount");

const submitWithdrawBtn =
    document.getElementById("submitWithdrawBtn");


function updateWithdrawalFee() {

    if (!withdrawAmountInput ||
        !withdrawFeeBox ||
        !withdrawAmountDisplay ||
        !withdrawFeeAmount ||
        !withdrawReceiveAmount) {
        return;
    }

    const amount = parseFloat(withdrawAmountInput.value) || 0;

    /* Nothing entered yet */
    if (amount <= 0) {

        withdrawFeeBox.classList.add("hidden");

        withdrawAmountDisplay.textContent = "0.00";
        withdrawFeeAmount.textContent = "0.00";
        withdrawReceiveAmount.textContent = "0.00";

        return;
    }

    /* 5% withdrawal fee */
    const fee = amount * 0.05;

    /* Amount after fee */
    const receive = amount - fee;


    /* Show the fee box immediately */
    withdrawFeeBox.classList.remove("hidden");


    /* Update values live */
    withdrawAmountDisplay.textContent =
        amount.toLocaleString("en-NG", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });

    withdrawFeeAmount.textContent =
        fee.toLocaleString("en-NG", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });

    withdrawReceiveAmount.textContent =
        receive.toLocaleString("en-NG", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
}


/* =========================================================
   UPDATE IMMEDIATELY WHILE USER TYPES
========================================================= */

if (withdrawAmountInput) {

    withdrawAmountInput.addEventListener(
        "input",
        updateWithdrawalFee
    );

}



function updateWithdrawalCalculation() {

    if (!withdrawAmountInput) return;

    const calculationBox =
        document.getElementById(
            "withdrawCalculation"
        );

    const amount =
        Number(withdrawAmountInput.value);


    /* SHOW IMMEDIATELY WHEN AMOUNT IS ENTERED */

    if (
        withdrawAmountInput.value.trim() &&
        Number.isFinite(amount) &&
        amount > 0
    ) {

        if (calculationBox) {

            calculationBox.classList.remove(
                "hidden"
            );

        }


        /* 5% WITHDRAWAL FEE */

        const withdrawalFee =
            amount * 0.05;


        /* TOTAL WITHDRAWAL */

        const totalCost =
            amount;


        /* AMOUNT RECEIVED */

        const amountReceived =
            amount - withdrawalFee;


      if (withdrawFeeDisplay) {

    withdrawFeeDisplay.textContent =
        formatFiatMoney(withdrawalFee);

}


if (withdrawTotalDisplay) {

    withdrawTotalDisplay.textContent =
        formatFiatMoney(totalCost);

}


if (withdrawReceiveDisplay) {

    withdrawReceiveDisplay.textContent =
        formatFiatMoney(amountReceived);

}

        return;

    }


    /*
     * Do not calculate until a valid amount
     * has actually been entered.
     */

  if (withdrawFeeDisplay) {

    withdrawFeeDisplay.textContent =
        formatFiatMoney(0);

}

if (withdrawTotalDisplay) {

    withdrawTotalDisplay.textContent =
        formatFiatMoney(0);

}

if (withdrawReceiveDisplay) {

    withdrawReceiveDisplay.textContent =
        formatFiatMoney(0);

}

}


/* =========================================================
   SUBMIT WITHDRAWAL
   CREATE withdrawalRequests USING ACTUAL ACCOUNT DEVICE ID
========================================================= */

if (submitWithdrawBtn) {

    submitWithdrawBtn.addEventListener(
        "click",
        async function () {

            const amount =
                Number(
                    withdrawAmountInput?.value
                );


            const bankInput =
                $("withdrawBank");

            const accountInput =
                $("withdrawAccount");

            const nameInput =
                $("withdrawName");


            const bank =
                bankInput?.value
                    .trim() || "";


            const account =
                accountInput?.value
                    .trim() || "";


            const accountName =
                nameInput?.value
                    .trim() || "";


            /* =================================================
               VALIDATE AMOUNT
            ================================================= */

            if (
                !Number.isFinite(amount) ||
                amount <= 0
            ) {

                showToast(
                    "Enter a valid withdrawal amount"
                );

                withdrawAmountInput?.focus();

                return;

            }


            /* =================================================
               GET CURRENT BALANCE
            ================================================= */

            const availableBalance =
                Number(
                    user?.balance || 0
                );


            if (
                amount >
                availableBalance
            ) {

                showToast(
                    "Withdrawal amount exceeds your available balance"
                );

                withdrawAmountInput?.focus();

                return;

            }


            /* =================================================
               WITHDRAWAL FEE
            ================================================= */

            const withdrawalFee =
                amount * 0.05;


            const amountReceived =
                amount -
                withdrawalFee;


            /* =================================================
               VALIDATE BANK
            ================================================= */

            if (!bank) {

                showToast(
                    "Enter your bank name"
                );

                bankInput?.focus();

                return;

            }


            /* =================================================
               VALIDATE ACCOUNT NUMBER
            ================================================= */

            if (
                !/^\d{10}$/.test(account)
            ) {

                showToast(
                    "Enter a valid 10-digit account number"
                );

                accountInput?.focus();

                return;

            }


            /* =================================================
               VALIDATE ACCOUNT NAME
            ================================================= */

            if (!accountName) {

                showToast(
                    "Enter the account name"
                );

                nameInput?.focus();

                return;

            }


            /* =================================================
               GET ACTUAL PAYZA ACCOUNT REFERENCE
            ================================================= */

            let accountRef;

            try {

                accountRef =
                    getDeviceAccountRef();

            } catch (error) {

                console.error(
                    "Unable to get Payza account reference:",
                    error
                );

                showToast(
                    "Unable to identify your Payza account"
                );

                return;

            }


            if (!accountRef) {

                console.error(
                    "getDeviceAccountRef() returned no reference"
                );

                showToast(
                    "Unable to identify your Payza account"
                );

                return;

            }


            /* =================================================
               ACTUAL DEVICE ID
            ================================================= */

            const actualDeviceId =
                accountRef.id;


            if (!actualDeviceId) {

                console.error(
                    "Payza account reference has no document ID:",
                    accountRef
                );

                showToast(
                    "Unable to identify your device"
                );

                return;

            }


            console.log(
                "Withdrawal device ID:",
                actualDeviceId
            );


            /* =================================================
               PREVENT DOUBLE SUBMISSION
            ================================================= */

            submitWithdrawBtn.disabled =
                true;

            submitWithdrawBtn.textContent =
                "Submitting...";


            try {

                /* =================================================
                   CREATE WITHDRAWAL REQUEST
                ================================================= */

                const withdrawalRef =
                    doc(
                        db,
                        "withdrawalRequests",
                        actualDeviceId
                    );


                await setDoc(
                    withdrawalRef,
                    {

                        deviceId:
                            actualDeviceId,

                        accountName:
                            user?.name || "",

                        accountAddress:
                            user?.accountAddress || "",

                        withdrawalAmount:
                            amount,

                        withdrawalFee:
                            withdrawalFee,

                        amountReceived:
                            amountReceived,

                        bankName:
                            bank,

                        bankAccountNumber:
                            account,

                        bankAccountName:
                            accountName,

                        status:
                            "pending",

                        requestType:
                            "withdrawal",

                        requestedAt:
                            serverTimestamp(),

                        updatedAt:
                            serverTimestamp()

                    },
                    {
                        merge: true
                    }
                );


                console.log(
                    "WITHDRAWAL REQUEST CREATED:",
                    actualDeviceId
                );

                /* =================================================
                   SUCCESS
                ================================================= */

                withdrawFeeBox?.classList.add(
                    "hidden"
                );


                withdrawModal?.classList.add(
                    "hidden"
                );


                showToast(
    `Withdrawal of ${formatFiatMoney(
        amountReceived
    )} submitted`
);


                /* =================================================
                   CLEAR FORM
                ================================================= */

                if (withdrawAmountInput) {

                    withdrawAmountInput.value =
                        "";

                }


                if (bankInput) {

                    bankInput.value =
                        "";

                }


                if (accountInput) {

                    accountInput.value =
                        "";

                }


                if (nameInput) {

                    nameInput.value =
                        "";

                }


                /* =================================================
                   RESET WITHDRAWAL DISPLAY
                ================================================= */

                if (withdrawAmountDisplay) {

                    withdrawAmountDisplay.textContent =
                        "0.00";

                }


                if (withdrawFeeAmount) {

                    withdrawFeeAmount.textContent =
                        "0.00";

                }


                if (withdrawReceiveAmount) {

                    withdrawReceiveAmount.textContent =
                        "0.00";

                }


                if (withdrawFeeBox) {

                    withdrawFeeBox.classList.add(
                        "hidden"
                    );

                }


                const calculationBox =
                    document.getElementById(
                        "withdrawCalculation"
                    );


                if (calculationBox) {

                    calculationBox.classList.add(
                        "hidden"
                    );

                }


            } catch (error) {

                console.error(
                    "WITHDRAWAL FIRESTORE ERROR:",
                    error
                );

                console.error(
                    "ERROR CODE:",
                    error?.code
                );

                console.error(
                    "ERROR MESSAGE:",
                    error?.message
                );

                showToast(
                    error?.message ||
                    "Unable to submit withdrawal request"
                );

                return;

            } finally {

                submitWithdrawBtn.disabled =
                    false;

                submitWithdrawBtn.innerHTML =
                    "Submit Withdrawal";

            }

        }
    );

}

/* =========================================================
   WITHDRAW SAVINGS
   MOVE SAVINGS BACK TO AVAILABLE BALANCE
========================================================= */

const withdrawSavingsBtn =
    document.getElementById("withdrawSavingsBtn");

const withdrawSavingsModal =
    document.getElementById("withdrawSavingsModal");

const closeWithdrawSavingsModal =
    document.getElementById("closeWithdrawSavingsModal");

const cancelWithdrawSavingsBtn =
    document.getElementById("cancelWithdrawSavingsBtn");

const confirmWithdrawSavingsBtn =
    document.getElementById("confirmWithdrawSavingsBtn");

const withdrawSavingsAmountInput =
    document.getElementById("withdrawSavingsAmountInput");

const withdrawSavingsAvailable =
    document.getElementById("withdrawSavingsAvailable");

const withdrawSavingsSummary =
    document.getElementById("withdrawSavingsSummary");

const withdrawSavingsProcessing =
    document.getElementById("withdrawSavingsProcessing");

const withdrawSavingsOptions =
    document.querySelectorAll(
        ".savings-withdraw-option"
    );


/* =========================================================
   GET CURRENT SAVINGS
========================================================= */

function getCurrentSavingsAmount() {

    if (
        typeof user !== "undefined" &&
        user?.savings
    ) {

        return Number(
            user.savings.amount || 0
        );

    }

    return 0;
}


/* =========================================================
   OPEN WITHDRAW SAVINGS CARD
========================================================= */

function openWithdrawSavingsModal() {

    if (!withdrawSavingsModal) return;

    const savingsAmount =
        getCurrentSavingsAmount();

    if (withdrawSavingsAvailable) {

        withdrawSavingsAvailable.textContent =
    formatFiatMoney(savingsAmount);

    }

    if (withdrawSavingsAmountInput) {

        withdrawSavingsAmountInput.value = "";

    }

    if (withdrawSavingsSummary) {

        withdrawSavingsSummary.textContent =
            "0.00";

    }

    withdrawSavingsOptions.forEach(button => {

        button.classList.remove("active");

    });

    withdrawSavingsModal.classList.remove(
        "hidden"
    );

}


/* =========================================================
   CLOSE WITHDRAW SAVINGS CARD
========================================================= */

function closeWithdrawSavingsModalHandler() {

    if (!withdrawSavingsModal) return;

    withdrawSavingsModal.classList.add(
        "hidden"
    );

}


/* =========================================================
   OPEN BUTTON
========================================================= */

if (withdrawSavingsBtn) {

    withdrawSavingsBtn.addEventListener(
        "click",
        openWithdrawSavingsModal
    );

}


/* =========================================================
   CLOSE BUTTONS
========================================================= */

if (closeWithdrawSavingsModal) {

    closeWithdrawSavingsModal.addEventListener(
        "click",
        closeWithdrawSavingsModalHandler
    );

}


if (cancelWithdrawSavingsBtn) {

    cancelWithdrawSavingsBtn.addEventListener(
        "click",
        closeWithdrawSavingsModalHandler
    );

}


/* =========================================================
   UPDATE WITHDRAW SUMMARY
========================================================= */

function updateWithdrawSavingsSummary() {

    if (!withdrawSavingsAmountInput) return;

    const savingsAmount =
        getCurrentSavingsAmount();

    let amount =
        Number(
            withdrawSavingsAmountInput.value || 0
        );

    if (amount < 0) {

        amount = 0;

    }

    if (amount > savingsAmount) {

        amount = savingsAmount;

        withdrawSavingsAmountInput.value =
            savingsAmount;

    }

    if (withdrawSavingsSummary) {

        withdrawSavingsSummary.textContent =
    formatFiatMoney(amount);

    }
}


/* =========================================================
   MANUAL AMOUNT
========================================================= */

if (withdrawSavingsAmountInput) {

    withdrawSavingsAmountInput.addEventListener(
        "input",
        () => {

            withdrawSavingsOptions.forEach(
                button => {
                    button.classList.remove(
                        "active"
                    );
                }
            );

            updateWithdrawSavingsSummary();

        }
    );

}


/* =========================================================
   QUICK AMOUNT BUTTONS
========================================================= */

withdrawSavingsOptions.forEach(button => {

    button.addEventListener(
        "click",
        () => {

            const savingsAmount =
                getCurrentSavingsAmount();

            const percent =
                Number(
                    button.dataset.withdrawPercent || 0
                );

            const amount =
                savingsAmount *
                (percent / 100);

            if (withdrawSavingsAmountInput) {

                withdrawSavingsAmountInput.value =
                    amount.toFixed(2);

            }

            withdrawSavingsOptions.forEach(
                option => {

                    option.classList.remove(
                        "active"
                    );

                }
            );

            button.classList.add("active");

            updateWithdrawSavingsSummary();

        }
    );

});


/* =========================================================
   CONFIRM WITHDRAWAL
========================================================= */

if (confirmWithdrawSavingsBtn) {

    confirmWithdrawSavingsBtn.addEventListener(
        "click",
        async () => {

            if (
                withdrawSavingsProcessing &&
                !withdrawSavingsProcessing.classList.contains(
                    "hidden"
                )
            ) {
                return;
            }


            const amount =
                Number(
                    withdrawSavingsAmountInput?.value || 0
                );


            if (!amount || amount <= 0) {

                showToast(
                    "Please enter a withdrawal amount."
                );

                return;

            }


            try {

                /* -----------------------------------------
                   GET REAL ACCOUNT
                ----------------------------------------- */

                const accountRef =
                    getDeviceAccountRef();

                const accountSnapshot =
                    await getDoc(accountRef);


                if (!accountSnapshot.exists()) {

                    throw new Error(
                        "Payza account not found."
                    );

                }


                const accountData =
                    accountSnapshot.data();


                /* -----------------------------------------
                   GET REAL VALUES
                ----------------------------------------- */

                const currentSavings =
                    accountData.savings || {};


                const currentSavingsAmount =
                    Number(
                        currentSavings.amount || 0
                    );


                const currentBalance =
                    Number(
                        accountData.balance || 0
                    );


                /* -----------------------------------------
                   RECHECK AMOUNT
                   IMPORTANT FOR FIREBASE DATA
                ----------------------------------------- */

                if (
                    amount > currentSavingsAmount
                ) {

                    showToast(
                        "Withdrawal amount is greater than your savings."
                    );

                    return;

                }


                /* -----------------------------------------
                   PROCESSING
                ----------------------------------------- */

                confirmWithdrawSavingsBtn.disabled =
                    true;


                if (withdrawSavingsProcessing) {

                    withdrawSavingsProcessing.classList.remove(
                        "hidden"
                    );

                }


                await new Promise(resolve =>
                    setTimeout(resolve, 900)
                );


                /* -----------------------------------------
                   CALCULATE NEW VALUES
                ----------------------------------------- */

                /* -----------------------------------------
   CALCULATE NEW SAVINGS VALUE
----------------------------------------- */

const newSavingsAmount =
    Math.max(
        0,
        currentSavingsAmount - amount
    );


/* -----------------------------------------
   CALCULATE REMAINING DAILY INTEREST
   Daily Interest must follow the amount
   of Savings that remains.
----------------------------------------- */

const currentDailyInterest =
    Number(
        currentSavings.dailyInterest || 0
    );

let newDailyInterest = 0;

if (
    currentSavingsAmount > 0 &&
    newSavingsAmount > 0
) {

    newDailyInterest =
        currentDailyInterest *
        (
            newSavingsAmount /
            currentSavingsAmount
        );

}


/* -----------------------------------------
   IF ALL SAVINGS ARE WITHDRAWN
   DAILY INTEREST MUST BE ZERO.
----------------------------------------- */

if (
    newSavingsAmount <= 0
) {

    newDailyInterest = 0;

}


/* -----------------------------------------
   NEW AVAILABLE BALANCE
----------------------------------------- */

const newBalance =
    currentBalance + amount;


                /* -----------------------------------------
                   SAVE TO FIREBASE
                ----------------------------------------- */

                await updateDoc(
                    accountRef,
                    {

                        balance:
                            newBalance,

                        savings: {

                            amount:
                                newSavingsAmount,

                               interest:
                            Number(
                           currentSavings.interest || 0
                          ),

                            dailyInterest:
                                newDailyInterest,

                            rate:
                                Number(
                                    currentSavings.rate || 0
                                ),

                            createdAt:
                                currentSavings.createdAt || null,

                            lastInterestAt:
                                currentSavings.lastInterestAt || Date.now()

                        },

                        updatedAt:
                            Date.now()

                    }
                );


                /* -----------------------------------------
                   UPDATE LOCAL USER
                ----------------------------------------- */

                if (
                    typeof user !== "undefined" &&
                    user
                ) {

                    user.balance =
                        newBalance;


                    user.savings = {

                        amount:
                            newSavingsAmount,

                       interest:
                            calculateEarnedSavingsInterest(
                          currentSavings
                        ),

                        dailyInterest:
                          newDailyInterest,

                        rate:
                            Number(
                                currentSavings.rate || 0
                            ),

                        createdAt:
                            currentSavings.createdAt || null,

                        lastInterestAt:
                            currentSavings.lastInterestAt ||
                            Date.now()

                    };

                }


                /* -----------------------------------------
                   UPDATE HOME BALANCE
                ----------------------------------------- */

                if (
                    typeof updateBalanceUI ===
                    "function"
                ) {

                    updateBalanceUI();

                }


                /* -----------------------------------------
                   UPDATE SAVINGS EVERYWHERE
                ----------------------------------------- */

                if (
                    typeof updateSavingsUI ===
                    "function"
                ) {

                    updateSavingsUI();

                }


                /* -----------------------------------------
                   CLOSE CARD
                ----------------------------------------- */

                closeWithdrawSavingsModalHandler();


                /* -----------------------------------------
                   UPDATE DASHBOARD
                ----------------------------------------- */

                if (withdrawSavingsAvailable) {

                   withdrawSavingsAvailable.textContent =
    formatFiatMoney(newSavingsAmount);

                }


                /* -----------------------------------------
                   SUCCESS
                ----------------------------------------- */

                showToast(
                    `ȼ̲${formatMoney(amount)} withdrawn successfully.`
                );


            } catch (error) {

                console.error(
                    "Savings withdrawal error:",
                    error
                );

                showToast(
                    "Unable to withdraw savings. Please try again."
                );


            } finally {

                confirmWithdrawSavingsBtn.disabled =
                    false;


                if (withdrawSavingsProcessing) {

                    withdrawSavingsProcessing.classList.add(
                        "hidden"
                    );

                }

            }

        }
    );

}

/* =========================================================
   COPY FUNCTION
========================================================= */

async function copyText(
    text,
    message = "Copied"
) {

    try {

        await navigator.clipboard.writeText(
            text
        );

    } catch {

        const textarea =
            document.createElement(
                "textarea"
            );


        textarea.value =
            text;


        document.body.appendChild(
            textarea
        );


        textarea.select();


        document.execCommand(
            "copy"
        );


        textarea.remove();

    }


    showToast(
        message
    );

}


/* =========================================================
   ACCOUNT ADDRESS COPY
========================================================= */

const copyAddressBtn =
    $("copyAddressBtn");


if (copyAddressBtn) {

    copyAddressBtn.addEventListener(
        "click",
        async () => {

            const address =
                $("accountAddress")
                    .textContent
                    .trim();


            await copyText(
                address
            );


            copyAddressBtn.textContent =
                "Copied";


            setTimeout(
                () => {

                    copyAddressBtn.textContent =
                        "Copy";

                },
                1200
            );

        }
    );

}

/* =========================================================
   COPY VENDOR ACCOUNT NUMBER
========================================================= */

const copyVendorAccount =
    document.getElementById("copyVendorAccount");

if (copyVendorAccount) {

    copyVendorAccount.addEventListener("click", async () => {

        const accountElement =
            document.getElementById("vendorAccountNumber");

        const accountNumber =
            accountElement?.textContent.trim();

        if (!accountNumber) {
            showToast("Account number not available");
            return;
        }

        try {

            await navigator.clipboard.writeText(accountNumber);

            copyVendorAccount.textContent = "Copied";

            showToast("Account number copied");

            setTimeout(() => {
                copyVendorAccount.textContent = "Copy";
            }, 1800);

        } catch (error) {

            console.error(
                "Account number copy error:",
                error
            );

            showToast("Unable to copy account number");
        }

    });

}


/* =========================================================
   COPY CRYPTO WALLET ADDRESS
========================================================= */

const copyCryptoWalletBtn =
    document.getElementById("copyCryptoWalletBtn");

if (copyCryptoWalletBtn) {

    copyCryptoWalletBtn.addEventListener("click", async () => {

        const walletElement =
            document.getElementById("cryptoWalletAddress");

        const walletAddress =
            walletElement?.textContent.trim();

        if (!walletAddress) {
            showToast("Wallet address not available");
            return;
        }

        try {

            await navigator.clipboard.writeText(walletAddress);

            copyCryptoWalletBtn.textContent = "Copied";

            showToast("Wallet address copied");

            setTimeout(() => {
                copyCryptoWalletBtn.textContent = "Copy";
            }, 1800);

        } catch (error) {

            console.error(
                "Wallet address copy error:",
                error
            );

            showToast("Unable to copy wallet address");
        }

    });

}

const bankTransferDone =
    document.getElementById("bankTransferDone");

if (bankTransferDone) {

    bankTransferDone.addEventListener("click", () => {

        const bankTransferModal =
            document.getElementById("bankTransferModal");

        bankTransferModal.classList.add("hidden");

    });

}

/* =========================================================
   REFERRAL POPUP
========================================================= */

function showReferralPopup() {

    if (!referralModal) return;


    referralModal.classList.remove(
        "hidden"
    );

}


function closeReferralPopup() {

    if (!referralModal) return;


    referralModal.classList.add(
        "hidden"
    );

}


/* =========================================================
   REFERRAL CLOSE BUTTONS
========================================================= */

const closeReferralModal =
    $("closeReferralModal");


if (closeReferralModal) {

    closeReferralModal.addEventListener(
        "click",
        closeReferralPopup
    );

}


const cancelReferralBtn =
    $("cancelReferralBtn");


if (cancelReferralBtn) {

    cancelReferralBtn.addEventListener(
        "click",
        closeReferralPopup
    );

}

const cancelSelectedCredit =
    $("cancelSelectedCredit");

if (cancelSelectedCredit) {

    cancelSelectedCredit.addEventListener(
        "click",
        () => {

            selectedCreditModal.classList.add(
                "hidden"
            );

            window.payzaAccountNumberPurchase =
                false;

        }
    );

}



/* =========================================================
   REFERRAL COPY
========================================================= */

const copyReferralBtn =
    $("copyReferralBtn");


if (copyReferralBtn) {

    copyReferralBtn.addEventListener(
        "click",
        async () => {

            const link =
                $("referralLink")
                    .textContent
                    .trim();


            await copyText(
                link,
                "Referral link copied"
            );


            copyReferralBtn.innerHTML =
                "✓ Copied";


            setTimeout(
                () => {

                    copyReferralBtn.innerHTML =
                        "Copy Referral Link";

                },
                1500
            );

        }
    );

}


/* =========================================================
   REFERRAL SHARE
========================================================= */

const shareReferralBtn =
    $("shareReferralBtn");


if (shareReferralBtn) {

    shareReferralBtn.addEventListener(
        "click",
        async () => {

            const link =
                $("referralLink")
                    .textContent
                    .trim();


            if (
                navigator.share
            ) {

                try {

                    await navigator.share({

                        title:
                            "Join me on Payza",

                        text:
                            "Join me on Payza",

                        url:
                            link

                    });

                } catch {

                    /*
                     * User cancelled sharing.
                     */

                }

            } else {

                await copyText(
                    link,
                    "Referral link copied"
                );

            }

        }
    );

}


/* =========================================================
   CLICK OUTSIDE REFERRAL
========================================================= */

if (referralModal) {

    referralModal.addEventListener(
        "click",
        event => {

            if (
                event.target ===
                referralModal
            ) {

                closeReferralPopup();

            }

        }
    );

}


/* =========================================================
   NAVIGATION
========================================================= */

document
    .querySelectorAll(
        ".nav-item"
    )
    .forEach(
        item => {

            item.addEventListener(
                "click",
                () => {

                    document
                        .querySelectorAll(
                            ".nav-item"
                        )
                        .forEach(
                            nav => {

                                nav.classList.remove(
                                    "active"
                                );

                            }
                        );


                    item.classList.add(
                        "active"
                    );

                }
            );

        }
    );


/* =========================================================
   NOTIFICATIONS
========================================================= */

const notificationButton =
    $("notificationButton");


if (notificationButton) {

    notificationButton.addEventListener(
        "click",
        () => {

            showToast(
                "No new notifications"
            );

        }
    );

}


/* =========================================================
   CLOSE MODALS OUTSIDE
========================================================= */

[
    creditModal,
    selectedCreditModal,
    withdrawModal
]
    .filter(
        modal => modal
    )
    .forEach(
        modal => {

            modal.addEventListener(
                "click",
                event => {

                    if (
                        event.target ===
                        modal
                    ) {

                        modal.classList.add(
                            "hidden"
                        );

                    }

                }
            );

        }
    );

    /* =========================================================
   QUICK ACTIONS
========================================================= */

const quickBuyCredit =
    $("quickBuyCredit");

const quickSendCredit =
    $("quickSendCredit");

const quickSaveCredit =
    $("quickSaveCredit");

const quickTopUp =
    $("quickTopUp");


/*
 * BUY CREDIT
 */

if (quickBuyCredit) {

    quickBuyCredit.addEventListener(
        "click",
        () => {

            if (creditModal) {

                creditModal.classList.remove(
                    "hidden"
                );

            }

        }
    );

}


const RECEIVE_ACCOUNT_AMOUNT = 1000;

let RECEIVE_ACCOUNT_COST = 3450;

window.payzaAccountNumberPurchase = false;


/* =========================================================
   REALTIME ACCOUNT NUMBER COST FROM ADMIN
========================================================= */

let accountNumberCostListener = null;

function listenForAccountNumberCost() {

    const currencyRef =
        doc(
            db,
            "appSettings",
            "currency"
        );

    if (accountNumberCostListener) {
        accountNumberCostListener();
        accountNumberCostListener = null;
    }

    accountNumberCostListener =
        onSnapshot(
            currencyRef,
            snapshot => {

                if (!snapshot.exists()) {

                    RECEIVE_ACCOUNT_COST =
                        3450;

                    return;
                }

                const settings =
                    snapshot.data();

                const savedCost =
                    Number(
                        settings.accountNumberCost
                    );

                if (
                    Number.isFinite(savedCost)
                ) {

                    RECEIVE_ACCOUNT_COST =
                        savedCost;

                }

                /*
                 * Update Account Number price
                 * everywhere it is currently visible.
                 */

                document
                    .querySelectorAll(
                        ".receive-account-cost, .receive-confirm-price, #receiveAccountCost"
                    )
                    .forEach(
                        element => {

                            element.textContent =
                                formatFiatMoney(
                                    RECEIVE_ACCOUNT_COST
                                );

                        }
                    );


                /*
                 * Update Credit Summary if
                 * Account Number purchase is active.
                 */

                if (
                    window.payzaAccountNumberPurchase === true
                ) {

                    const selectedReturn =
                        document.getElementById(
                            "selectedReturn"
                        );

                    if (selectedReturn) {

                        selectedReturn.textContent =
                            formatFiatMoney(
                                RECEIVE_ACCOUNT_COST
                            );

                    }

                }

            },
            error => {

                console.error(
                    "Account Number cost listener error:",
                    error
                );

            }
        );
}

let receiveCreditModal = null;
let receiveAccountConfirmModal = null;


/* =========================================================
   ACCOUNT NUMBER STATE
========================================================= */

function hasApprovedAccountNumber() {

    return (
        user &&
        user.accountNumberApproved === true &&
        typeof user.accountNumber === "string" &&
        user.accountNumber.trim() !== ""
    );

}


function hasPendingAccountNumberRequest() {

    return (
        user &&
        user.accountNumberRequested === true &&
        user.accountNumberApproved !== true
    );

}

/* =========================================================
   ACCOUNT NUMBER / CREDIT PAYMENT METHOD SUBMISSION
========================================================= */

async function submitPayzaPaymentRequest(
    paymentMethod
) {

    try {

        const accountRef =
            getDeviceAccountRef();


        const accountSnapshot =
            await getDoc(
                accountRef
            );


        if (!accountSnapshot.exists()) {

            showToast(
                "Payza account not found"
            );

            return false;

        }


        const accountData =
            accountSnapshot.data();


        /*
         * =====================================================
         * ACCOUNT NUMBER REQUEST
         * =====================================================
         */

        if (
            window.payzaAccountNumberPurchase === true
        ) {

            /*
             * Already approved.
             */

            if (
                accountData.accountNumberApproved === true &&
                accountData.accountNumber
            ) {

                user.accountNumber =
                    accountData.accountNumber;

                user.accountAddress =
                    accountData.accountAddress ||
                    accountData.accountNumber;

                user.accountNumberApproved =
                    true;

                showApprovedAccountNumber();

                return false;

            }


            /*
             * Already pending.
             */

            if (
                accountData.accountNumberRequested === true &&
                accountData.accountNumberApproved !== true
            ) {

                showPendingAccountNumberRequest();

                return false;

            }


            /*
             * Create the separate Admin request.
             */

            await setDoc(
                doc(
                    db,
                    "accountNumberRequests",
                    payzaDeviceId
                ),
                {

                    deviceId:
                        payzaDeviceId,

                    accountName:
                        accountData.name ||
                        user?.name ||
                        "",

                    accountAddress:
                        accountData.accountAddress ||
                        user?.accountAddress ||
                        "",

                    paymentAmount:
                        RECEIVE_ACCOUNT_AMOUNT,

                    paymentCost:
                        RECEIVE_ACCOUNT_COST,

                    paymentMethod:
                        paymentMethod,

                    requestType:
                        "account_number_request",

                    status:
                        "pending",

                    accountNumber:
                        null,

                    accountNumberApproved:
                        false,

                    requestedAt:
                        serverTimestamp(),

                    updatedAt:
                        serverTimestamp()

                }
            );


            /*
             * Mark Payza account as requested.
             */

            await updateDoc(
                accountRef,
                {

                    accountNumberRequested:
                        true,

                    accountNumberApproved:
                        false,

                    accountNumber:
                        null,

                    updatedAt:
                        serverTimestamp()

                }
            );


            user.accountNumberRequested =
                true;

            user.accountNumberApproved =
                false;

            user.accountNumber =
                null;


            window.payzaAccountNumberPurchase =
                false;


            updateReceiveCreditHomeUI();


            selectedCreditModal?.classList.add(
                "hidden"
            );


            showToast(
                "Account Number request sent successfully"
            );


            return true;

        }


       const creditAmount =
    Number(
        selectedPayzaCreditAmount
    );

if (
    !Number.isFinite(
        creditAmount
    ) ||
    creditAmount <= 0
) {

    showToast(
        "Invalid Credit amount"
    );

    return false;

}

const creditCost =
    Number(
        (
            creditAmount *
            CREDIT_COST_RATE
        ).toFixed(2)
    );


        await setDoc(
            doc(
                db,
                "creditRequests",
                payzaDeviceId
            ),
            {

                deviceId:
                    payzaDeviceId,

                accountName:
                    accountData.name ||
                    user?.name ||
                    "",

                accountAddress:
                    accountData.accountAddress ||
                    user?.accountAddress ||
                    "",

                accountNumber:
                    accountData.accountNumber ||
                    user?.accountNumber ||
                    "",

                creditAmount:
                    creditAmount,

                creditCost:
                    creditCost,

                paymentMethod:
                    paymentMethod,

                transactionType:
                    "credit_purchase",

                accountNumberPurchase:
                    false,

                status:
                    "pending",

                requestedAt:
                    serverTimestamp(),

                updatedAt:
                    serverTimestamp()

            }
        );


        selectedCreditModal?.classList.add(
            "hidden"
        );


        showToast(
            "Credit request sent successfully"
        );


        return true;


    } catch (error) {

        console.error(
            "Payza request submission error:",
            error
        );


        showToast(
            "Unable to send request"
        );


        return false;

    }

}

/* =========================================================
   CREATE RECEIVE CREDIT MODALS
========================================================= */

function createReceiveCreditModal() {

    receiveCreditModal =
        document.getElementById(
            "receiveCreditModal"
        );

    receiveAccountConfirmModal =
        document.getElementById(
            "receiveAccountConfirmModal"
        );


    /* =====================================================
       RECEIVE CREDIT CARD
    ===================================================== */

    if (!receiveCreditModal) {

        receiveCreditModal =
            document.createElement("div");

        receiveCreditModal.id =
            "receiveCreditModal";

        receiveCreditModal.className =
            "payza-modal-overlay hidden";

        receiveCreditModal.innerHTML = `

            <div class="receive-credit-card">

                <button
                    type="button"
                    class="receive-credit-close"
                    id="closeReceiveCreditModal"
                    aria-label="Close"
                >
                    ×
                </button>

                <div class="receive-credit-icon">
                    ȼ̲
                </div>

                <h2>
                    Receive Credit
                </h2>

                <p class="receive-credit-subtitle">
                    Get your Payza Credit Account Number
                </p>

                <div class="receive-credit-info">

                    <h3>
                        Get Your Credit Account Number
                    </h3>

                    <p>
                        Your Payza Credit Account Number allows
                        other Payza users to send Credit directly
                        to your account.
                    </p>

                    <p>
                        Once approved, your account number will
                        be permanently assigned to this device
                        account.
                    </p>

                    <div class="receive-credit-instructions">

                        <div class="receive-instruction">
                            <span>1</span>
                            <div>
                                <strong>
                                    Request your account number
                                </strong>
                                <small>
                                    Purchase your Payza Credit
                                    Account Number.
                                </small>
                            </div>
                        </div>

                        <div class="receive-instruction">
                            <span>2</span>
                            <div>
                                <strong>
                                    Wait for approval
                                </strong>
                                <small>
                                    Your request will be reviewed
                                    by Payza Admin.
                                </small>
                            </div>
                        </div>

                        <div class="receive-instruction">
                            <span>3</span>
                            <div>
                                <strong>
                                    Receive Credit
                                </strong>
                                <small>
                                    After approval, share your
                                    Account Number to receive Credit.
                                </small>
                            </div>
                        </div>

                    </div>

                </div>

                <div class="receive-credit-note">

                    <strong>
                        Important
                    </strong>

                    <span>
                        Your Account Number is assigned only to
                        this Payza device account and can only
                        become visible after Admin approval.
                    </span>

                </div>

                <button
                    type="button"
                    id="getAccountNumberBtn"
                    class="receive-credit-proceed-btn"
                >
                    Get Account Number
                    <span>→</span>
                </button>

            </div>
        `;

        document.body.appendChild(
            receiveCreditModal
        );

    }


    /* =====================================================
       ACCOUNT NUMBER PAYMENT CONFIRMATION
    ===================================================== */

    if (!receiveAccountConfirmModal) {

        receiveAccountConfirmModal =
            document.createElement("div");

        receiveAccountConfirmModal.id =
            "receiveAccountConfirmModal";

        receiveAccountConfirmModal.className =
            "payza-modal-overlay hidden";

        receiveAccountConfirmModal.innerHTML = `

            <div class="receive-account-confirm-card">

                <button
                    type="button"
                    class="receive-credit-close"
                    id="closeReceiveAccountConfirm"
                    aria-label="Close"
                >
                    ×
                </button>

                <div class="receive-confirm-icon">
                    ȼ̲
                </div>

                <h2>
                    Get Your Account Number
                </h2>

                <p class="receive-confirm-text">
                    Getting your Payza Credit Account Number
                    requires a one-time payment.
                </p>

                <div class="receive-account-cost-box">

                   <div class="receive-confirm-price">
    ${formatFiatMoney(RECEIVE_ACCOUNT_COST)}
</div>

                    <p class="receive-confirm-small">
                        This payment is only for your Payza
                        Credit Account Number. It does NOT
                        purchase Credit and it will NOT be
                        added to your Available Balance.
                    </p>

                </div>

                <div class="receive-confirm-actions">

                    <button
                        type="button"
                        id="cancelReceiveAccountNumber"
                        class="receive-cancel-btn"
                    >
                        Cancel
                    </button>

                    <button
                        type="button"
                        id="proceedReceiveAccountNumber"
                        class="receive-proceed-btn"
                    >
                        Proceed
                        <span>→</span>
                    </button>

                </div>

            </div>
        `;

        document.body.appendChild(
            receiveAccountConfirmModal
        );

    }

    function updateFiatCurrencySymbols() {

    const symbol =
        getCurrencySymbol();


    document
        .querySelectorAll(
            ".withdraw-currency-symbol"
        )
        .forEach(
            element => {

                element.textContent =
                    symbol;

            }
        );

}


    /* =====================================================
       GET ACCOUNT NUMBER BUTTON
    ===================================================== */

    const getAccountNumberBtn =
        document.getElementById(
            "getAccountNumberBtn"
        );

    if (getAccountNumberBtn) {

        getAccountNumberBtn.onclick =
            function (event) {

                event.preventDefault();
                event.stopPropagation();


                /* -----------------------------------------
                   ALREADY APPROVED
                ----------------------------------------- */

                if (
                    hasApprovedAccountNumber()
                ) {

                    showApprovedAccountNumber();

                    return;

                }


                /* -----------------------------------------
                   REQUEST ALREADY PENDING
                ----------------------------------------- */

                if (
                    hasPendingAccountNumberRequest()
                ) {

                    showPendingAccountNumberRequest();

                    return;

                }


                /* -----------------------------------------
                   NEW REQUEST
                ----------------------------------------- */

                if (receiveAccountConfirmModal) {

                    receiveAccountConfirmModal.classList.remove(
                        "hidden"
                    );

                }

            };

    }


    /* =====================================================
       CLOSE RECEIVE CREDIT
    ===================================================== */

    const closeReceiveCreditBtn =
        document.getElementById(
            "closeReceiveCreditModal"
        );

    if (closeReceiveCreditBtn) {

        closeReceiveCreditBtn.onclick =
            function (event) {

                event.preventDefault();
                event.stopPropagation();

                receiveCreditModal.classList.add(
                    "hidden"
                );

            };

    }


    /* =====================================================
       CLOSE ACCOUNT NUMBER CONFIRMATION
    ===================================================== */

    const closeReceiveAccountConfirm =
        document.getElementById(
            "closeReceiveAccountConfirm"
        );

    if (closeReceiveAccountConfirm) {

        closeReceiveAccountConfirm.onclick =
            function (event) {

                event.preventDefault();
                event.stopPropagation();

                receiveAccountConfirmModal.classList.add(
                    "hidden"
                );

            };

    }


    /* =====================================================
       CANCEL ACCOUNT NUMBER REQUEST
    ===================================================== */

    const cancelReceiveAccountNumber =
        document.getElementById(
            "cancelReceiveAccountNumber"
        );

    if (cancelReceiveAccountNumber) {

        cancelReceiveAccountNumber.onclick =
            function (event) {

                event.preventDefault();
                event.stopPropagation();

                receiveAccountConfirmModal.classList.add(
                    "hidden"
                );

            };

    }


    /* =====================================================
       PROCEED — ACCOUNT NUMBER PAYMENT
    ===================================================== */

    const proceedReceiveAccountNumber =
        document.getElementById(
            "proceedReceiveAccountNumber"
        );

    if (proceedReceiveAccountNumber) {

        proceedReceiveAccountNumber.onclick =
            function (event) {

                event.preventDefault();
                event.stopPropagation();


                /*
                 * Mark the Credit Summary as being used
                 * for the Account Number payment.
                 *
                 * IMPORTANT:
                 * This flag does NOT mean Credit was purchased.
                 */

                window.payzaAccountNumberPurchase =
                    true;


                receiveAccountConfirmModal.classList.add(
                    "hidden"
                );


                /*
                 * Open the existing payment summary.
                 */

                openCreditSummary(
                    RECEIVE_ACCOUNT_AMOUNT
                );

            };

    }


    /* =====================================================
       OUTSIDE CLICK — RECEIVE CREDIT
    ===================================================== */

    receiveCreditModal.onclick =
        function (event) {

            if (
                event.target ===
                receiveCreditModal
            ) {

                receiveCreditModal.classList.add(
                    "hidden"
                );

            }

        };


    /* =====================================================
       OUTSIDE CLICK — CONFIRMATION
    ===================================================== */

    receiveAccountConfirmModal.onclick =
        function (event) {

            if (
                event.target ===
                receiveAccountConfirmModal
            ) {

                receiveAccountConfirmModal.classList.add(
                    "hidden"
                );

            }

        };

}


/* =========================================================
   PENDING ACCOUNT NUMBER REQUEST
========================================================= */

function showPendingAccountNumberRequest() {

    createReceiveCreditModal();


    const card =
        receiveCreditModal?.querySelector(
            ".receive-credit-card"
        );

    if (!card) return;


    card.innerHTML = `

        <button
            type="button"
            class="receive-credit-close"
            id="closePendingReceiveCredit"
            aria-label="Close"
        >
            ×
        </button>

        <div class="receive-credit-icon">
            ȼ̲
        </div>

        <h2>
            Receive Credit
        </h2>

        <p class="receive-credit-subtitle">
            Account Number Request
        </p>

        <div class="receive-approved-account-box">

            <span>
                Account Number
            </span>

            <strong>
                Pending Approval
            </strong>

        </div>

        <div class="receive-credit-note">

            <strong>
                Waiting for Admin Approval
            </strong>

            <span>
                Your Account Number request has already
                been submitted. Your full Payza Account
                Number will appear here only after Admin
                approves this request.
            </span>

        </div>

    `;


    receiveCreditModal.classList.remove(
        "hidden"
    );


    const closeBtn =
        document.getElementById(
            "closePendingReceiveCredit"
        );

    if (closeBtn) {

        closeBtn.onclick =
            function () {

                receiveCreditModal.classList.add(
                    "hidden"
                );

            };

    }

}


/* =========================================================
   APPROVED ACCOUNT NUMBER
========================================================= */

function showApprovedAccountNumber() {

    /*
     * NEVER reveal the number unless Admin
     * has approved this exact device account.
     */

    if (
        !hasApprovedAccountNumber()
    ) {

        if (
            hasPendingAccountNumberRequest()
        ) {

            showPendingAccountNumberRequest();

        }

        return;

    }


    createReceiveCreditModal();


    const card =
        receiveCreditModal?.querySelector(
            ".receive-credit-card"
        );

    if (!card) return;


   card.innerHTML = `

    <button
        type="button"
        class="receive-credit-close"
        id="closeApprovedReceiveCredit"
        aria-label="Close"
    >
        ×
    </button>

    <div class="receive-account-header">

        <div class="receive-credit-icon">
            ȼ̲
        </div>

        <div class="receive-account-title">

            <span class="receive-credit-eyebrow">
                PAYZA CREDIT
            </span>

            <h2>
                Receive Credit
            </h2>

            <p>
                Your Payza Credit Account Number
            </p>

        </div>

    </div>

    <div class="receive-account-number-card">

        <div class="receive-account-number-top">

            <div class="receive-account-number-label">
                <span class="account-number-dot"></span>
                <span>ACCOUNT NUMBER</span>
            </div>

            <span class="receive-account-active-label">
                ACTIVE
            </span>

        </div>

        <div class="receive-account-number-row">

            <strong id="approvedReceiveAccountNumber">
    ${user.accountNumber}
</strong>

            <button
                type="button"
                id="copyApprovedAccountNumber"
                class="receive-copy-account-btn"
            >
                <span class="copy-icon">⧉</span>
                <span>Copy</span>
            </button>

        </div>

        <div class="receive-account-number-status">

            <span class="status-check">✓</span>

            <span>
                Account Number Active
            </span>

        </div>

    </div>

    <div class="receive-account-ready-card">

        <div class="receive-ready-icon">
            ȼ̲
        </div>

        <div class="receive-ready-content">

            <span class="receive-ready-label">
                CREDIT RECEIVING
            </span>

            <strong>
                Ready to Receive Credit
            </strong>

            <p>
                Share this Account Number with another
                Payza user so they can send Credit directly
                to your account.
            </p>

        </div>

    </div>

    <div class="receive-account-security">

        <div class="security-icon">
            🔒
        </div>

        <div class="security-content">

            <strong>
                Keep Your Account Number Safe
            </strong>

            <span>
                Only share your Payza Account Number with
                people you trust.
            </span>

        </div>

    </div>

`;


    receiveCreditModal.classList.remove(
        "hidden"
    );


    const closeBtn =
        document.getElementById(
            "closeApprovedReceiveCredit"
        );

    if (closeBtn) {

        closeBtn.onclick =
            function () {

                receiveCreditModal.classList.add(
                    "hidden"
                );

            };

    }


    const copyBtn =
        document.getElementById(
            "copyApprovedAccountNumber"
        );

    if (copyBtn) {

        copyBtn.onclick =
            async function () {

              const accountNumber =
    user.accountNumber;

                await copyText(
                    accountNumber
                );


                copyBtn.textContent =
                    "Copied";


                setTimeout(
                    () => {

                        copyBtn.textContent =
                            "Copy";

                    },
                    1200
                );

            };

    }

}


/* =========================================================
   OPEN RECEIVE CREDIT
========================================================= */

function openReceiveCredit() {

    /*
     * APPROVED:
     * Show full Account Number.
     */

    if (
        hasApprovedAccountNumber()
    ) {

        showApprovedAccountNumber();

        return;

    }


    /*
     * PENDING:
     * Do not allow another request.
     */

    if (
        hasPendingAccountNumberRequest()
    ) {

        showPendingAccountNumberRequest();

        return;

    }


    /*
     * FIRST REQUEST:
     * Show the normal Receive Credit card.
     */

    createReceiveCreditModal();

    receiveCreditModal.classList.remove(
        "hidden"
    );

}


/* =========================================================
   TOP UP = RECEIVE CREDIT
========================================================= */

if (quickTopUp) {

    quickTopUp.addEventListener(
        "click",
        openReceiveCredit
    );

}


/* =========================================================
   HOME PAGE ACCOUNT NUMBER
========================================================= */

function updateReceiveCreditHomeUI() {

    const accountNumber =
    user?.accountNumber || "";

    const approved =
        user?.accountNumberApproved === true;


    document
        .querySelectorAll(
            ".account-address"
        )
        .forEach(
            element => {

                if (
    approved &&
    accountNumber
) {

                    /*
                     * ONLY AFTER ADMIN APPROVAL:
                     * Show the generated Payza Account Address.
                     */

                    element.textContent =
    accountNumber;

                } else {

                    /*
                     * BEFORE ADMIN APPROVAL:
                     * Never reveal the generated Account Address.
                     */

                    element.textContent =
                        "Account Number Pending";

                }

            }
        );

}


function syncAccountNumberState(accountData) {

    if (!accountData) {
        return;
    }

    user.accountNumber =
        accountData.accountNumber || "";

    user.accountNumberApproved =
        accountData.accountNumberApproved === true;

    user.accountNumberRequested =
        accountData.accountNumberRequested === true;

    updateReceiveCreditHomeUI();

}

/* =========================================================
   SEND CREDIT
========================================================= */

const sendCreditModal =
    $("sendCreditModal");

const closeSendCreditModal =
    $("closeSendCreditModal");

const sendAvailableBalance =
    $("sendAvailableBalance");

const beneficiaryAddressInput =
    $("beneficiaryAddressInput");

const sendCreditAmountInput =
    $("sendCreditAmountInput");

const confirmSendCreditBtn =
    $("confirmSendCreditBtn");


function openSendCreditModal() {

    const balance =
        Number(user.balance || 0);


    if (balance <= 0) {

        showToast(
            "You have zero credit to send"
        );

        return;

    }


    if (sendAvailableBalance) {

        sendAvailableBalance.textContent =
            formatMoney(balance);

    }


    if (beneficiaryAddressInput) {

        beneficiaryAddressInput.value =
            "";

    }


    if (sendCreditAmountInput) {

        sendCreditAmountInput.value =
            "";

    }


    if ($("beneficiaryPreview")) {

        $("beneficiaryPreview")
            .classList.add("hidden");

    }


    sendCreditModal.classList.remove(
        "hidden"
    );

}


if (quickSendCredit) {

    quickSendCredit.addEventListener(
        "click",
        openSendCreditModal
    );

}


if (closeSendCreditModal) {

    closeSendCreditModal.addEventListener(
        "click",
        () => {

            sendCreditModal.classList.add(
                "hidden"
            );

        }
    );

}


/* =========================================================
   FIND BENEFICIARY BY ACCOUNT NUMBER
========================================================= */

async function findBeneficiary(
    accountNumber
) {

    const accountsRef =
        collection(
            db,
            "payzaAccounts"
        );

    const beneficiaryQuery =
        query(
            accountsRef,
            where(
                "accountNumber",
                "==",
                accountNumber
            )
        );

    const result =
        await getDocs(
            beneficiaryQuery
        );

    if (result.empty) {
        return null;
    }

    return result.docs[0];
}


/* =========================================================
   SEND CREDIT
========================================================= */

if (confirmSendCreditBtn) {

    confirmSendCreditBtn.addEventListener(
        "click",
        async () => {

            const beneficiaryAddress =
                beneficiaryAddressInput.value
                    .trim()
                    .toUpperCase();


            const amount =
                Number(
                    sendCreditAmountInput.value
                );


            if (
    beneficiaryAddress ===
    user.accountAddress
) {
    showToast(
        "You cannot send credit to yourself"
    );

    return;
}


            if (
                !Number.isFinite(amount) ||
                amount <= 0
            ) {

                showToast(
                    "Enter a valid amount"
                );

                return;

            }


            const currentBalance =
                Number(
                    user.balance || 0
                );


            if (currentBalance <= 0) {

                showToast(
                    "You have zero credit to send"
                );

                return;

            }


            if (
                amount >
                currentBalance
            ) {

                showToast(
                    "Insufficient balance"
                );

                return;

            }


           if (
    beneficiaryAccountNumber ===
    String(user.accountNumber || "").trim()
) {

    showToast(
        "You cannot send credit to yourself"
    );

    return;
}


            confirmSendCreditBtn.disabled =
                true;


            confirmSendCreditBtn.innerHTML =
                "Checking account...";


            try {

                const beneficiary =
    await findBeneficiary(
        beneficiaryAccountNumber
    );


                if (!beneficiary) {

                    showToast(
                        "Beneficiary account not found"
                    );

                    return;

                }


                const beneficiaryData =
                    beneficiary.data();


                const beneficiaryRef =
                    beneficiary.ref;


                /*
                 * Deduct sender balance.
                 */

                const senderRef =
                    getDeviceAccountRef();


                await updateDoc(
                    senderRef,
                    {
                        balance:
                            increment(-amount),

                        updatedAt:
                            Date.now()
                    }
                );


                /*
                 * Add to beneficiary balance.
                 */

                await updateDoc(
                    beneficiaryRef,
                    {
                        balance:
                            increment(amount),

                        updatedAt:
                            Date.now()
                    }
                );


                /*
                 * Update current UI.
                 */

                user.balance =
                    currentBalance -
                    amount;


                updateBalanceUI();

                updateSavingsUI();

                updateSavingsAccountStatus(user);


                if (sendAvailableBalance) {

                    sendAvailableBalance.textContent =
                        formatMoney(
                            user.balance
                        );

                }


                sendCreditModal.classList.add(
                    "hidden"
                );


                showToast(
                    `ȼ̲${formatMoney(amount)} sent successfully`
                );


            } catch (error) {

                console.error(
                    "Send credit error:",
                    error
                );


                showToast(
                    "Unable to send credit"
                );


            } finally {

                confirmSendCreditBtn.disabled =
                    false;

                confirmSendCreditBtn.innerHTML =
                    "Confirm & Proceed <span>→</span>";

            }

        }
    );

}

/* =========================================================
   SAVE CREDIT
========================================================= */

const savingsPlansModal =
    $("savingsPlansModal");

const closeSavingsPlansModal =
    $("closeSavingsPlansModal");

const savingsPaymentModal =
    $("savingsPaymentModal");

const closeSavingsPaymentModal =
    $("closeSavingsPaymentModal");

const iHavePaidSavingsBtn =
    $("iHavePaidSavingsBtn");

let selectedSavingsPlan = {

    amount: 0,

    rate: 0,

    dailyInterest: 0

};

async function fixCurrentSavingsRate() {

    try {

        const accountRef =
            getDeviceAccountRef();

        await updateDoc(
            accountRef,
            {
                "savings.rate": 0.04,
                "savings.dailyInterest": 125,
                updatedAt: Date.now()
            }
        );

        console.log(
            "Savings rate successfully changed to 0.04%"
        );

    } catch (error) {

        console.error(
            "Failed to update savings rate:",
            error
        );

    }

}

fixCurrentSavingsRate();

const customSavingsAmount =
    $("customSavingsAmount");

const submitCustomSavingsBtn =
    $("submitCustomSavingsBtn");

/* =========================================================
   OPEN SAVINGS
========================================================= */

function openSavingsPlans() {

    savingsPlansModal.classList.remove(
        "hidden"
    );

}


if (quickSaveCredit) {

    quickSaveCredit.addEventListener(
        "click",
        openSavingsPlans
    );

}


if (closeSavingsPlansModal) {

    closeSavingsPlansModal.addEventListener(
        "click",
        () => {

            savingsPlansModal.classList.add(
                "hidden"
            );

        }
    );

}


/* =========================================================
   SELECT SAVINGS PLAN
========================================================= */

document
    .querySelectorAll(
        ".savings-plan"
    )
    .forEach(
        plan => {

          plan.addEventListener(
    "click",
    () => {

        resetSavingsAccountStatus();

        const amount =
            Number(
                plan.dataset.savingsAmount
            );

        const rate =
            Number(
                plan.dataset.savingsRate
            );

        const dailyInterest =
            amount *
            (rate / 100);

        selectedSavingsPlan = {

            amount,

            rate,

            dailyInterest

        };

        $("savingsPaymentAmount")
            .textContent =
            `ȼ̲${formatMoney(amount)}`;

        $("savingsPaymentRate")
            .textContent =
            `${rate}%`;

        $("savingsDailyEarning")
            .textContent =
            `ȼ̲${formatMoney(
                dailyInterest
            )}`;

        savingsPlansModal.classList.add(
            "hidden"
        );

        savingsPaymentModal.classList.remove(
            "hidden"
        );

    }
);

        }
    );


/* =========================================================
   CLOSE SAVINGS PAYMENT
========================================================= */

if (closeSavingsPaymentModal) {

    closeSavingsPaymentModal.addEventListener(
        "click",
        () => {

            savingsPaymentModal.classList.add(
                "hidden"
            );

        }
    );

}

function submitCustomSavings() {

    resetSavingsAccountStatus();

    const amount =
        Number(
            customSavingsAmount.value
        );

    if (
        !Number.isFinite(amount) ||
        amount <= 0
    ) {

        showToast(
            "Enter a valid Credit Savings amount"
        );

        customSavingsAmount.focus();

        return;
    }


    /*
     * FIXED DAILY RATE:
     * 0.04%
     */
    const rate = 0.04;


    /*
     * DAILY INTEREST:
     *
     * Example:
     * 312,500 × 0.04% = 125.00
     */
    const dailyInterest =
        amount *
        (rate / 100);


    selectedSavingsPlan = {

        amount:
            amount,

        rate:
            rate,

        dailyInterest:
            dailyInterest

    };


    const savingsPaymentAmount =
        $("savingsPaymentAmount");

    const savingsPaymentRate =
        $("savingsPaymentRate");

    const savingsDailyEarning =
        $("savingsDailyEarning");


    if (savingsPaymentAmount) {

        savingsPaymentAmount.textContent =
            `ȼ̲${formatMoney(amount)}`;

    }


    if (savingsPaymentRate) {

        savingsPaymentRate.textContent =
            `${rate}%`;

    }


    if (savingsDailyEarning) {

        savingsDailyEarning.textContent =
            `ȼ̲${formatMoney(
                dailyInterest
            )}`;

    }


    savingsPlansModal.classList.add(
        "hidden"
    );


    savingsPaymentModal.classList.remove(
        "hidden"
    );

 
    customSavingsAmount.value =
        "";

}

if (
    submitCustomSavingsBtn &&
    customSavingsAmount
) {

    submitCustomSavingsBtn.addEventListener(
        "click",
        submitCustomSavings
    );


    customSavingsAmount.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Enter"
            ) {

                submitCustomSavings();

            }

        }
    );

} 

function updateSavingsAccountStatus(accountData = null) {

    const resultBox =
        document.getElementById("savingsAccountStatusResult");

    const balanceElement =
        document.getElementById("savingsStatusBalance");

    const statusElement =
        document.getElementById("savingsStatusAccount");

    const nameElement =
        document.getElementById("savingsStatusName");


    const account =
        accountData || user || {};


    const balance =
        Number(account.balance || 0);


    const accountName =
        account.name ||
        account.fullName ||
        user.name ||
        "—";


    if (balanceElement) {

        balanceElement.innerHTML = `
            <span>Available Balance:</span>
            <strong>ȼ̲${formatMoney(balance)}</strong>
        `;

    }


    if (statusElement) {

        statusElement.innerHTML = `
            <span>Account Status:</span>

            <button
                type="button"
                id="savingsTopUpStatusBtn"
                class="savings-topup-status-btn"
            >
                TopUp
            </button>
        `;

    }


    if (nameElement) {

        nameElement.innerHTML = `
            <span>Account Name:</span>
            <strong>${accountName}</strong>
        `;

    }


    if (resultBox) {

        resultBox.classList.add("show");

        resultBox.style.display = "block";

    }


    const topUpButton =
        document.getElementById(
            "savingsTopUpStatusBtn"
        );


    if (topUpButton) {

        topUpButton.onclick = function(event) {

            event.preventDefault();
            event.stopPropagation();


            const creditStore =
                document.getElementById(
                    "creditModal"
                );


            if (!creditStore) {

                showToast(
                    "Credits Store could not be opened"
                );

                return;

            }


            creditStore.classList.remove(
                "hidden"
            );

            creditStore.style.display =
                "flex";

        };

    }

}

function resetSavingsAccountStatus() {

    updateSavingsAccountStatus(user);

}

function calculateEarnedSavingsInterest(savings = {}) {

    const dailyInterest =
        Number(
            savings.dailyInterest || 0
        );

    const existingInterest =
        Number(
            savings.interest || 0
        );

    const lastInterestAt =
        Number(
            savings.lastInterestAt || 0
        );

    if (
        dailyInterest <= 0 ||
        !lastInterestAt ||
        !Number.isFinite(lastInterestAt)
    ) {

        return existingInterest;

    }

    const THREE_HOURS =
        3 * 60 * 60 * 1000;

    const TWENTY_FOUR_HOURS =
        24 * 60 * 60 * 1000;

    const elapsed =
        Math.max(
            0,
            Date.now() -
            lastInterestAt
        );

    const completedThreeHourBlocks =
        Math.floor(
            elapsed /
            THREE_HOURS
        );

    const completedDays =
        Math.floor(
            completedThreeHourBlocks /
            8
        );

    if (
        completedDays <= 0
    ) {

        return existingInterest;

    }

    const completedInterest =
        dailyInterest *
        completedDays;

    return (
        existingInterest +
        completedInterest
    );

}

/* =========================================================
   SAVE CREDIT
   PROCESS SAVINGS
========================================================= */

if (iHavePaidSavingsBtn) {

    /*
     * Create the small "Save Again?" confirmation card.
     * This is NOT a browser alert.
     */
    function createSaveAgainConfirmCard() {

        if (document.getElementById("saveAgainConfirmCard")) {
            return;
        }


        const overlay =
            document.createElement("div");

        overlay.id =
            "saveAgainConfirmCard";

        overlay.className =
            "save-again-confirm-overlay";


        overlay.innerHTML = `

            <div
                class="save-again-confirm-card"
                role="dialog"
                aria-modal="true"
                aria-labelledby="saveAgainConfirmTitle"
            >

                <button
                    type="button"
                    class="save-again-confirm-close"
                    id="closeSaveAgainConfirm"
                    aria-label="Close"
                >
                    ×
                </button>


                <div class="save-again-confirm-icon">
                    ȼ̲
                </div>


                <div class="save-again-confirm-content">

                    <span class="save-again-confirm-eyebrow">
                        CREDIT SAVINGS
                    </span>

                    <h3 id="saveAgainConfirmTitle">
                        Save Again?
                    </h3>

                    <p>
                        Are you sure you want to save again?
                        This will add the selected Credit
                        amount to your existing savings.
                    </p>

                </div>


                <div class="save-again-confirm-actions">

                    <button
                        type="button"
                        id="cancelSaveAgain"
                        class="save-again-cancel-btn"
                    >
                        Cancel
                    </button>

                    <button
                        type="button"
                        id="confirmSaveAgain"
                        class="save-again-save-btn"
                    >
                        Save Again
                    </button>

                </div>

            </div>

        `;


        document.body.appendChild(
            overlay
        );


        const closeButton =
            document.getElementById(
                "closeSaveAgainConfirm"
            );

        const cancelButton =
            document.getElementById(
                "cancelSaveAgain"
            );

        const confirmButton =
            document.getElementById(
                "confirmSaveAgain"
            );


        function closeConfirmationCard() {

            overlay.classList.remove(
                "show"
            );

            setTimeout(
                () => {

                    overlay.remove();

                },
                180
            );

        }


        if (closeButton) {

            closeButton.onclick =
                closeConfirmationCard;

        }


        if (cancelButton) {

            cancelButton.onclick =
                closeConfirmationCard;

        }


        /*
         * Clicking outside the card closes it.
         */
        overlay.addEventListener(
            "click",
            event => {

                if (
                    event.target === overlay
                ) {

                    closeConfirmationCard();

                }

            }
        );


        /*
         * SAVE AGAIN
         */
        if (confirmButton) {

            confirmButton.onclick =
                function () {

                    closeConfirmationCard();

                    /*
                     * Run the actual savings process again.
                     */
                    processSavings();

                };

        }


        /*
         * Show after being added to the DOM
         * so the animation works properly.
         */
        requestAnimationFrame(
            () => {

                overlay.classList.add(
                    "show"
                );

            }
        );

    }

/* =========================================================
   SAVINGS INTEREST CALCULATION
   ---------------------------------------------------------
   DAILY INTEREST:
   - Earned internally every 3 hours.
   - 8 blocks = 24 hours.
   - Daily Interest is divided into 8 equal blocks.
   - Earned Interest is NOT updated during the day.
   - At the end of 24 hours, the COMPLETE Daily Interest
     is added to Earned Interest.
========================================================= */

function calculateEarnedSavingsInterest(savings = {}) {

    const dailyInterest =
        Number(savings.dailyInterest || 0);

    const existingInterest =
        Number(savings.interest || 0);

    const lastInterestAt =
        Number(savings.lastInterestAt || 0);

    if (
        dailyInterest <= 0 ||
        !lastInterestAt ||
        !Number.isFinite(lastInterestAt)
    ) {
        return existingInterest;
    }

    const THREE_HOURS =
        3 * 60 * 60 * 1000;

    const TWENTY_FOUR_HOURS =
        8 * THREE_HOURS;

    const elapsed =
        Math.max(
            0,
            Date.now() - lastInterestAt
        );

    /*
     * Count only COMPLETE 3-hour blocks.
     */
    const completedBlocks =
        Math.floor(
            elapsed / THREE_HOURS
        );

    /*
     * Eight completed blocks = one complete day.
     */
    const completedDays =
        Math.floor(
            completedBlocks / 8
        );

    if (completedDays <= 0) {
        return existingInterest;
    }

    /*
     * ONLY the complete Daily Interest for each
     * completed 24-hour day is added.
     */
    return (
        existingInterest +
        (
            dailyInterest *
            completedDays
        )
    );
}

/* =========================================================
   SAVE CREDIT
   PROCESS SAVINGS
   ---------------------------------------------------------
   - Saves the selected Credit amount into savings.
   - Immediately updates MY CREDIT SAVINGS.
   - Daily Interest is stored separately.
   - Earned Interest remains the completed-day amount.
   - Earned Interest does NOT continuously increase.
========================================================= */

async function processSavings() {

    const amount =
        Number(
            selectedSavingsPlan?.amount || 0
        );

    const rate =
        Number(
            selectedSavingsPlan?.rate || 0
        );

    const dailyInterest =
        Number(
            selectedSavingsPlan?.dailyInterest || 0
        );


    /* ---------------------------------------------
       MAKE SURE A PLAN WAS SELECTED
    --------------------------------------------- */

    if (
        !amount ||
        amount <= 0
    ) {

        showToast(
            "Please select a savings plan first."
        );

        return;

    }


    const processing =
        document.getElementById(
            "savingsProcessing"
        );


    const resultBox =
        document.getElementById(
            "savingsAccountStatusResult"
        );


    if (resultBox) {

        resultBox.classList.remove(
            "show"
        );

    }


    iHavePaidSavingsBtn.disabled =
        true;


    if (processing) {

        processing.classList.remove(
            "hidden"
        );

        processing.textContent =
            "Processing your request.....";

    }


    try {

        /* -----------------------------------------
           SMALL PROCESSING DELAY
        ----------------------------------------- */

        await new Promise(
            resolve =>
                setTimeout(
                    resolve,
                    1200
                )
        );


        /* -----------------------------------------
           GET REAL PAYZA ACCOUNT
        ----------------------------------------- */

        const accountRef =
            getDeviceAccountRef();


        const accountSnapshot =
            await getDoc(
                accountRef
            );


        if (
            !accountSnapshot.exists()
        ) {

            throw new Error(
                "Payza account not found."
            );

        }


        const accountData =
            accountSnapshot.data();


        /* -----------------------------------------
           AVAILABLE BALANCE
        ----------------------------------------- */

        const availableBalance =
            Number(
                accountData.balance || 0
            );


        /* -----------------------------------------
           CHECK BALANCE
        ----------------------------------------- */

        if (
            availableBalance < amount
        ) {

            if (processing) {

                processing.classList.add(
                    "hidden"
                );

            }

            iHavePaidSavingsBtn.disabled =
                false;


            showToast(
                `Insufficient Balance: ȼ̲${formatMoney(
                    availableBalance
                )}`
            );


            return;

        }


        /* -----------------------------------------
           EXISTING SAVINGS
        ----------------------------------------- */

        const currentSavings =
            accountData.savings || {};


        const currentSavingsAmount =
            Number(
                currentSavings.amount || 0
            );


        /*
         * Only COMPLETED days are added to
         * Earned Interest.
         *
         * Partial 3-hour earnings are NOT added
         * to the displayed Earned Interest.
         */
        const currentInterest =
            calculateEarnedSavingsInterest(
                currentSavings
            );


        const currentDailyInterest =
            Number(
                currentSavings.dailyInterest || 0
            );


        /* -----------------------------------------
           NEW SAVINGS VALUES
        ----------------------------------------- */

        const newSavingsAmount =
            currentSavingsAmount +
            amount;


        /*
         * Add the new plan's Daily Interest
         * to the existing Daily Interest.
         *
         * Example:
         *
         * Existing = 0
         * New      = 350
         * Result   = 350
         */
        const newDailyInterest =
            currentDailyInterest +
            dailyInterest;


        const newBalance =
            availableBalance -
            amount;


        /* -----------------------------------------
           START / CONTINUE SAVINGS CYCLE
        ----------------------------------------- */

        const savingsStartedAt =
            currentSavings.createdAt ||
            Date.now();


        /*
         * The interest timer starts from NOW
         * when the savings is first created.
         *
         * If savings already exists, keep the
         * existing timer.
         */
        const savingsLastInterestAt =
            currentSavings.lastInterestAt ||
            Date.now();


        /* -----------------------------------------
           SAVE TO FIREBASE
        ----------------------------------------- */

        await updateDoc(
            accountRef,
            {

                balance:
                    newBalance,

                savings: {

                    amount:
                        newSavingsAmount,

                    /*
                     * ONLY COMPLETED-DAY INTEREST
                     * is stored here.
                     */
                    interest:
                        currentInterest,

                    /*
                     * This is the full Daily Interest.
                     */
                    dailyInterest:
                        newDailyInterest,

                    rate:
                        rate,

                    createdAt:
                        savingsStartedAt,

                    lastInterestAt:
                        savingsLastInterestAt

                },

                updatedAt:
                    Date.now()

            }
        );


        /* -----------------------------------------
           UPDATE LOCAL USER IMMEDIATELY
        ----------------------------------------- */

        if (
            typeof user !== "undefined" &&
            user
        ) {

            user.balance =
                newBalance;


            user.savings = {

                amount:
                    newSavingsAmount,

                interest:
                    currentInterest,

                dailyInterest:
                    newDailyInterest,

                rate:
                    rate,

                createdAt:
                    savingsStartedAt,

                lastInterestAt:
                    savingsLastInterestAt

            };

        }


        /* -----------------------------------------
           UPDATE HOME BALANCE
        ----------------------------------------- */

        if (
            typeof updateBalanceUI ===
            "function"
        ) {

            updateBalanceUI();

        }


        /* -----------------------------------------
           UPDATE MY CREDIT SAVINGS
        ----------------------------------------- */

        if (
            typeof updateSavingsUI ===
            "function"
        ) {

            updateSavingsUI();

        }


        /* -----------------------------------------
           UPDATE PROGRESS
        ----------------------------------------- */

        updateSavingsProgressUI();


        /* -----------------------------------------
           UPDATE ACCOUNT STATUS
        ----------------------------------------- */

        const accountName =
            accountData.name ||
            accountData.fullName ||
            user.name ||
            "";


        updateSavingsAccountStatus({

            ...user,

            balance:
                newBalance,

            name:
                accountName

        });


        /* -----------------------------------------
           STOP PROCESSING
        ----------------------------------------- */

        if (processing) {

            processing.classList.add(
                "hidden"
            );

        }


        /*
         * Mark savings as successfully saved.
         */
        iHavePaidSavingsBtn.dataset.savedOnce =
            "true";


        iHavePaidSavingsBtn.disabled =
            false;


        /* -----------------------------------------
           SUCCESS
        ----------------------------------------- */

        showToast(
            "Savings processed successfully."
        );

    } catch (error) {

        console.error(
            "Savings processing error:",
            error
        );


        if (processing) {

            processing.classList.add(
                "hidden"
            );

        }


        iHavePaidSavingsBtn.disabled =
            false;


        showToast(
            "Unable to process savings. Please try again."
        );

    }

}



    /*
     * MAIN SAVE BUTTON
     */
    iHavePaidSavingsBtn.addEventListener(
        "click",
        function () {

            /*
             * If savings were already successfully
             * processed before, show the custom
             * confirmation card.
             */
            if (
                iHavePaidSavingsBtn.dataset.savedOnce ===
                "true"
            ) {

                createSaveAgainConfirmCard();

                return;

            }


            /*
             * FIRST SAVE:
             * Process immediately.
             */
            processSavings();

        }
    );

}

/* =========================================================
   MY CREDIT SAVINGS
========================================================= */

const savingsDashboardModal =
    $("savingsDashboardModal");

const showSavingsBtn =
    $("showSavingsBtn");

const closeSavingsDashboard =
    $("closeSavingsDashboard");

const closeSavingsDashboardBtn =
    $("closeSavingsDashboardBtn");


function openSavingsDashboard() {

    updateSavingsUI();

    savingsDashboardModal.classList.remove(
        "hidden"
    );

}


if (showSavingsBtn) {

    showSavingsBtn.addEventListener(
        "click",
        openSavingsDashboard
    );

}


if (closeSavingsDashboard) {

    closeSavingsDashboard.addEventListener(
        "click",
        () => {

            savingsDashboardModal.classList.add(
                "hidden"
            );

        }
    );

}


if (closeSavingsDashboardBtn) {

    closeSavingsDashboardBtn.addEventListener(
        "click",
        () => {

            savingsDashboardModal.classList.add(
                "hidden"
            );

        }
    );

}

const savingsTopUpBtn = document.getElementById("savingsTopUpBtn");

if (savingsTopUpBtn) {

    savingsTopUpBtn.addEventListener("click", () => {

        // Close savings payment/status modal
        document
            .getElementById("savingsPaymentModal")
            ?.classList.add("hidden");

        // Open the normal Credit Store
        document
            .getElementById("creditModal")
            ?.classList.remove("hidden");

    });

}



/* =========================================================
   SAVE COMPLETE CREDIT PAYMENT REQUEST
========================================================= */

async function notifyAdminPaymentMethod(paymentMethod) {

    try {

        /* =====================================================
           ACCOUNT NUMBER PURCHASE
        ===================================================== */

       /* =====================================================
   ACCOUNT NUMBER PURCHASE
===================================================== */

if (
    window.payzaAccountNumberPurchase === true
) {

    const accountRef =
        getDeviceAccountRef();

    const accountSnapshot =
        await getDoc(
            accountRef
        );

    if (!accountSnapshot.exists()) {

        showToast(
            "Payza account not found"
        );

        return false;
    }

    const accountData =
        accountSnapshot.data();

    await setDoc(
        doc(
            db,
            "accountNumberRequests",
            payzaDeviceId
        ),
        {

            deviceId:
                payzaDeviceId,

            accountName:
                accountData.name ||
                user?.name ||
                "",

            accountAddress:
                accountData.accountAddress ||
                user?.accountAddress ||
                "",

            paymentAmount:
                Number(
                    RECEIVE_ACCOUNT_AMOUNT
                ),

            paymentCost:
                Number(
                    RECEIVE_ACCOUNT_COST
                ),

            paymentMethod:
                paymentMethod,

            requestType:
                "account_number_request",

            status:
                "pending",

            accountNumber:
                null,

            accountNumberApproved:
                false,

            requestedAt:
                serverTimestamp(),

            updatedAt:
                serverTimestamp()

        }
    );

    console.log(
        "ACCOUNT NUMBER REQUEST SENT TO ADMIN:",
        {
            deviceId:
                payzaDeviceId,

            paymentMethod:
                paymentMethod,

            paymentCost:
                RECEIVE_ACCOUNT_COST
        }
    );

    return true;
}


        /* =====================================================
           NORMAL CREDIT PURCHASE
        ===================================================== */

        const accountRef =
            getDeviceAccountRef();


        const accountSnapshot =
            await getDoc(
                accountRef
            );


        if (!accountSnapshot.exists()) {

            showToast(
                "Payza account not found"
            );

            return false;
        }


        const accountData =
            accountSnapshot.data();


        /*
         * IMPORTANT:
         * Use the actual numeric amount selected by
         * the user. Do NOT read it from the formatted
         * selectedAmount HTML.
         */

        const creditAmount =
            Number(
                selectedPayzaCreditAmount
            );


        if (
            !Number.isFinite(
                creditAmount
            ) ||
            creditAmount <= 0
        ) {

            console.error(
                "INVALID SELECTED CREDIT AMOUNT:",
                selectedPayzaCreditAmount
            );

            showToast(
                "Invalid Credit amount"
            );

            return false;
        }


        const creditCost =
            Number(
                (
                    creditAmount *
                    CREDIT_COST_RATE
                ).toFixed(2)
            );


        if (
            !Number.isFinite(
                creditCost
            ) ||
            creditCost <= 0
        ) {

            showToast(
                "Invalid Credit cost"
            );

            return false;
        }


        /*
         * SAVE THE COMPLETE REQUEST.
         */

        await setDoc(
            doc(
                db,
                "creditRequests",
                payzaDeviceId
            ),
            {

                deviceId:
                    payzaDeviceId,

                accountName:
                    accountData.name ||
                    user?.name ||
                    "",

                accountAddress:
                    accountData.accountAddress ||
                    user?.accountAddress ||
                    "",

                accountNumber:
                    accountData.accountNumber ||
                    user?.accountNumber ||
                    "",

                creditAmount:
                    creditAmount,

                creditCost:
                    creditCost,

                paymentMethod:
                    paymentMethod,

                transactionType:
                    "credit_purchase",

                accountNumberPurchase:
                    false,

                status:
                    "pending",

                requestedAt:
                    serverTimestamp(),

                updatedAt:
                    serverTimestamp()

            }
        );


        console.log(
            "COMPLETE CREDIT REQUEST SAVED:",
            {
                deviceId:
                    payzaDeviceId,

                creditAmount:
                    creditAmount,

                creditCost:
                    creditCost,

                paymentMethod:
                    paymentMethod
            }
        );


        return true;


    } catch (error) {

        console.error(
            "Payment request submission error:",
            error
        );

        showToast(
            "Unable to send payment request"
        );

        return false;
    }

}

/* =========================================================
   PAYZA GLOBAL FIAT CURRENCY
   ADMIN CONTROLLED
========================================================= */

window.payzaCurrencySymbol =
    localStorage.getItem("payzaCurrencySymbol") || "₦";

let payzaPreviousCurrencySymbol =
    window.payzaCurrencySymbol;


/* =========================================================
   GET CURRENT FIAT SYMBOL
========================================================= */

function getCurrencySymbol() {

    const symbol =
        window.payzaCurrencySymbol;

    if (
        typeof symbol === "string" &&
        symbol.trim() !== ""
    ) {
        return symbol.trim();
    }

    return "₦";
}


/* =========================================================
   REAL-TIME ADMIN CURRENCY LISTENER
   ---------------------------------------------------------
   Admin changes the currency
        ↓
   Firestore appSettings/currency
        ↓
   User receives change immediately
        ↓
   UI refreshes automatically
========================================================= */

function listenForPayzaCurrency() {

    const currencyRef =
        doc(
            db,
            "appSettings",
            "currency"
        );


    onSnapshot(
        currencyRef,
        snapshot => {

            if (!snapshot.exists()) {
                return;
            }


            const data =
                snapshot.data();


            const newSymbol =
                typeof data.symbol === "string"
                    ? data.symbol.trim()
                    : "";


            if (!newSymbol) {
                return;
            }


            /* -----------------------------------------
               SAVE NEW SYMBOL
            ----------------------------------------- */

            payzaPreviousCurrencySymbol =
                window.payzaCurrencySymbol;

            window.payzaCurrencySymbol =
                newSymbol;


            localStorage.setItem(
                "payzaCurrencySymbol",
                newSymbol
            );


            /* -----------------------------------------
               REFRESH ALL FIAT UI
            ----------------------------------------- */

            refreshPayzaCurrencyUI();


            /* -----------------------------------------
               REFRESH CURRENTLY OPEN MODALS
            ----------------------------------------- */

            updateBalanceUI();


            if (
                typeof updateSavingsUI ===
                "function"
            ) {
                updateSavingsUI();
            }


            if (
                typeof updateReceiveCreditHomeUI ===
                "function"
            ) {
                updateReceiveCreditHomeUI();
            }


            if (
                typeof updateSavingsAccountStatus ===
                "function"
            ) {
                updateSavingsAccountStatus(
                    user
                );
            }

        },

        error => {

            console.error(
                "Payza currency realtime listener error:",
                error
            );

        }
    );

}

/* =========================================================
   FORMAT FIAT MONEY
   ---------------------------------------------------------
   Uses the Admin-selected currency symbol.
   Prevents duplicate symbols such as €€, $$, ₦₦, ££.
========================================================= */

function formatFiatMoney(amount) {

    const numericAmount =
        Number(amount || 0);

    let symbol =
        String(
            getCurrencySymbol() || ""
        ).trim();

    /*
     * Remove accidental duplicate copies
     * of the same currency symbol.
     *
     * €€  → €
     * $$  → $
     * ₦₦  → ₦
     * ££  → £
     */
    if (
        symbol.length > 1 &&
        /^(.)(\1)+$/u.test(symbol)
    ) {

        symbol =
            symbol.charAt(0);

    }

    return (
        symbol +
        numericAmount.toLocaleString(
            "en-NG",
            {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }
        )
    );

}


/* =========================================================
   UPDATE FIAT-ONLY SYMBOL ELEMENTS
   ---------------------------------------------------------
   Used where the symbol exists separately from
   the amount, such as:

   Amount to Withdraw
   $
========================================================= */

function updateFiatCurrencySymbols() {

    const symbol =
        getCurrencySymbol();


    document
        .querySelectorAll(
            ".withdraw-currency-symbol, " +
            ".fiat-currency-symbol"
        )
        .forEach(
            element => {

                element.textContent =
                    symbol;

            }
        );

}


/* =========================================================
   REFRESH PAYZA FIAT CURRENCY UI
========================================================= */

function refreshPayzaCurrencyUI() {

    const oldSymbol =
        payzaPreviousCurrencySymbol || "₦";

    const newSymbol =
        getCurrencySymbol();


    /* -----------------------------------------
       UPDATE STANDALONE SYMBOL ELEMENTS
    ----------------------------------------- */

    document
        .querySelectorAll(
            ".withdraw-currency-symbol, " +
            ".fiat-currency-symbol"
        )
        .forEach(
            element => {

                element.textContent =
                    newSymbol;

            }
        );


    /* -----------------------------------------
       UPDATE EXISTING TEXT
       THAT STILL CONTAINS THE OLD SYMBOL
    ----------------------------------------- */

    const walker =
        document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT
        );


    const nodes = [];

    let node;

    while (
        node =
        walker.nextNode()
    ) {

        nodes.push(node);

    }


    nodes.forEach(
        textNode => {

            if (
                !textNode.nodeValue
            ) {
                return;
            }


            /*
             * Never touch the Credit currency ȼ̲.
             */

            if (
                textNode.nodeValue.includes("ȼ̲")
            ) {
                return;
            }


            if (
                oldSymbol &&
                textNode.nodeValue.includes(
                    oldSymbol
                )
            ) {

                textNode.nodeValue =
                    textNode.nodeValue.replace(
                        new RegExp(
                            escapeRegExp(
                                oldSymbol
                            ),
                            "g"
                        ),
                        newSymbol
                    );

            }


            /*
             * Also replace old hard-coded Naira
             * when the previous symbol was something else.
             */

            if (
                oldSymbol !== "₦" &&
                textNode.nodeValue.includes("₦")
            ) {

                textNode.nodeValue =
                    textNode.nodeValue.replace(
                        /₦/g,
                        newSymbol
                    );

            }

        }
    );


    payzaPreviousCurrencySymbol =
        newSymbol;

}


/* =========================================================
   REGEX ESCAPE
========================================================= */

function escapeRegExp(value) {

    return value.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
    );

}


/* =========================================================
   LISTEN FOR ADMIN CURRENCY CHANGE
========================================================= */

window.addEventListener(
    "payzaCurrencyChanged",
    event => {

        const symbol =
            event?.detail?.symbol;


        if (
            typeof symbol !== "string" ||
            !symbol.trim()
        ) {

            return;

        }


        window.payzaCurrencySymbol =
            symbol.trim();


        localStorage.setItem(
            "payzaCurrencySymbol",
            window.payzaCurrencySymbol
        );


        refreshPayzaCurrencyUI();

    }
);


/* =========================================================
   INITIAL CURRENCY UPDATE
========================================================= */

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        () => {

            refreshPayzaCurrencyUI();

        },
        {
            once: true
        }
    );

} else {

    refreshPayzaCurrencyUI();

}



/* =========================================================
   ADMIN CURRENCY CHANGE
========================================================= */

window.addEventListener(
    "payzaCurrencyChanged",
    event => {

        const symbol =
            event?.detail?.symbol;


        if (
            typeof symbol !== "string" ||
            !symbol.trim()
        ) {

            return;

        }


        window.payzaCurrencySymbol =
            symbol.trim();


        localStorage.setItem(
            "payzaCurrencySymbol",
            window.payzaCurrencySymbol
        );


        /*
         * Update anything already
         * rendered on the page.
         */

        refreshPayzaCurrencyUI();

    }
);


/* =========================================================
   INITIAL CURRENCY LOAD
========================================================= */

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        () => {

            refreshPayzaCurrencyUI();

        },
        {
            once: true
        }
    );

} else {

    refreshPayzaCurrencyUI();

}


/* =========================================================
   INITIAL CURRENCY UPDATE
========================================================= */

if (document.readyState === "loading") {

    document.addEventListener(
        "DOMContentLoaded",
        () => {
            refreshPayzaCurrencyUI();
        },
        { once: true }
    );

} else {

    refreshPayzaCurrencyUI();

}

// =========================================================
// BANK TRANSFER PAYMENT
// =========================================================

const bankTransferPaymentBtn =
    document.getElementById("bankTransferPaymentBtn");

const bankTransferModal =
    document.getElementById("bankTransferModal");

const bankTransferPaymentAmount =
    document.getElementById("bankTransferPaymentAmount");


if (bankTransferPaymentBtn) {

    bankTransferPaymentBtn.addEventListener(
        "click",
        async function (event) {

            event.preventDefault();
            event.stopPropagation();


            /*
             * Get the correct payment amount.
             *
             * For Account Number purchase this is
             * RECEIVE_ACCOUNT_COST.
             *
             * For normal Credit purchase this is
             * the Credit Cost already shown in
             * the Credit Summary.
             */

            let paymentAmount;


            if (
                window.payzaAccountNumberPurchase === true
            ) {

                paymentAmount =
                    Number(RECEIVE_ACCOUNT_COST);

            } else {

                const creditCostText =
                    document.getElementById(
                        "selectedReturn"
                    )?.textContent || "";

                paymentAmount =
                    parseFloat(
                        creditCostText.replace(
                            /[^0-9.]/g,
                            ""
                        )
                    );

            }


            if (
                !Number.isFinite(paymentAmount) ||
                paymentAmount <= 0
            ) {

                paymentAmount = 0;

            }


            if (bankTransferPaymentAmount) {

                bankTransferPaymentAmount.textContent =
                    formatFiatMoney(
                        paymentAmount
                    );

            }

/*
 * =====================================================
 * SET BANK TRANSFER PAYMENT SCREEN LABELS
 * =====================================================
 */

const bankTransferTitle =
    document.querySelector(
        ".bank-transfer-eyebrow"
    );

const bankTransferCostLabel =
    document.querySelector(
        ".bank-payment-amount span"
    );


if (
    window.payzaAccountNumberPurchase === true
) {

    /*
     * ACCOUNT NUMBER PURCHASE
     */

    if (bankTransferTitle) {

        bankTransferTitle.textContent =
            "Account Number";

    }


    if (bankTransferCostLabel) {

        bankTransferCostLabel.textContent =
            "Account Number";

    }

} else {

    /*
     * NORMAL CREDIT PURCHASE
     */

    if (bankTransferTitle) {

        bankTransferTitle.textContent =
            "PAYZA CREDIT";

    }


    if (bankTransferCostLabel) {

        bankTransferCostLabel.textContent =
            "Credit Cost";

    }

}


/*
 * =====================================================
 * OPEN THE BANK TRANSFER CARD
 * =====================================================
 */

if (bankTransferModal) {

    bankTransferModal.classList.remove(
        "hidden"
    );

}


            /*
             * Notify Admin after the payment
             * card has opened.
             */

            try {

                await notifyAdminPaymentMethod(
                    "bank_transfer"
                );

            } catch (error) {

                console.error(
                    "Bank transfer admin notification failed:",
                    error
                );

            }

        }
    );

}


// =========================================================
// CLOSE BANK TRANSFER MODAL
// =========================================================

const bankTransferClose =
    document.getElementById(
        "bankTransferClose"
    );


if (bankTransferClose) {

    bankTransferClose.addEventListener(
        "click",
        function () {

            if (bankTransferModal) {

                bankTransferModal.classList.add(
                    "hidden"
                );

            }

        }
    );

}


// =========================================================
// CLOSE BANK TRANSFER WHEN CLICKING OUTSIDE
// =========================================================

if (bankTransferModal) {

    bankTransferModal.addEventListener(
        "click",
        function (event) {

            if (
                event.target ===
                bankTransferModal
            ) {

                bankTransferModal.classList.add(
                    "hidden"
                );

            }

        }
    );

}


// =========================================================
// CRYPTO PAYMENT
// =========================================================

const cryptoPaymentBtn =
    document.getElementById(
        "cryptoPaymentBtn"
    );

const cryptoWalletModal =
    document.getElementById(
        "cryptoWalletModal"
    );

const cryptoPaymentAmount =
    document.getElementById(
        "cryptoPaymentAmount"
    );


if (cryptoPaymentBtn) {

    cryptoPaymentBtn.addEventListener(
        "click",
        async function (event) {

            event.preventDefault();
            event.stopPropagation();


            /*
             * Get the correct payment amount.
             */

            let paymentAmount;


            if (
                window.payzaAccountNumberPurchase === true
            ) {

                paymentAmount =
                    Number(RECEIVE_ACCOUNT_COST);

            } else {

                const creditCostText =
                    document.getElementById(
                        "selectedReturn"
                    )?.textContent || "";

                paymentAmount =
                    parseFloat(
                        creditCostText.replace(
                            /[^0-9.]/g,
                            ""
                        )
                    );

            }


            if (
                !Number.isFinite(paymentAmount) ||
                paymentAmount <= 0
            ) {

                paymentAmount = 0;

            }


            if (cryptoPaymentAmount) {

                cryptoPaymentAmount.textContent =
                    formatFiatMoney(
                        paymentAmount
                    );

            }


            /*
             * OPEN CRYPTO WALLET FIRST.
             */

           /*
 * =====================================================
 * SET PAYMENT SCREEN LABELS
 * =====================================================
 */

const cryptoTitle =
    document.querySelector(
        ".crypto-wallet-title span"
    );

const cryptoCostLabel =
    document.querySelector(
        ".crypto-payment-amount span"
    );


if (
    window.payzaAccountNumberPurchase === true
) {

    /*
     * ACCOUNT NUMBER PURCHASE
     */

    if (cryptoTitle) {

        cryptoTitle.textContent =
            "Account Number";

    }


    if (cryptoCostLabel) {

        cryptoCostLabel.textContent =
            "Account Number";

    }

} else {

    /*
     * NORMAL CREDIT PURCHASE
     */

    if (cryptoTitle) {

        cryptoTitle.textContent =
            "PAYZA CRYPTO PAYMENT";

    }


    if (cryptoCostLabel) {

        cryptoCostLabel.textContent =
            "Credit Cost";

    }

}


/*
 * OPEN CRYPTO WALLET FIRST.
 */

if (cryptoWalletModal) {

    cryptoWalletModal.classList.remove(
        "hidden"
    );

}


            /*
             * Notify Admin after the wallet
             * has opened.
             */

            try {

                await notifyAdminPaymentMethod(
                    "crypto"
                );

            } catch (error) {

                console.error(
                    "Crypto admin notification failed:",
                    error
                );

            }

        }
    );

}


// =========================================================
// CLOSE CRYPTO WALLET
// =========================================================

const cryptoWalletClose =
    document.getElementById(
        "cryptoWalletClose"
    );

const cryptoWalletDone =
    document.getElementById(
        "cryptoWalletDone"
    );


if (cryptoWalletClose) {

    cryptoWalletClose.addEventListener(
        "click",
        function () {

            if (cryptoWalletModal) {

                cryptoWalletModal.classList.add(
                    "hidden"
                );

            }

        }
    );

}


if (cryptoWalletDone) {

    cryptoWalletDone.addEventListener(
        "click",
        function () {

            if (cryptoWalletModal) {

                cryptoWalletModal.classList.add(
                    "hidden"
                );

            }

        }
    );

}


// =========================================================
// CLOSE CRYPTO WHEN CLICKING OUTSIDE
// =========================================================

if (cryptoWalletModal) {

    cryptoWalletModal.addEventListener(
        "click",
        function (event) {

            if (
                event.target ===
                cryptoWalletModal
            ) {

                cryptoWalletModal.classList.add(
                    "hidden"
                );

            }

        }
    );

}

/* =========================================================
   REAL-TIME ACCOUNT BALANCE
   ADMIN APPROVAL SYNC
========================================================= */

function listenToPayzaAccount() {

    if (accountBalanceListener) {

        accountBalanceListener();

        accountBalanceListener = null;

    }


    const accountRef =
        getDeviceAccountRef();


    accountBalanceListener =
        onSnapshot(
            accountRef,
            snapshot => {

                if (!snapshot.exists()) {

                    return;

                }


                const accountData =
                    snapshot.data();


                /*
                 * ALWAYS USE THE FIREBASE
                 * ACCOUNT BALANCE.
                 */

                user.balance =
                    Number(
                        accountData.balance || 0
                    );


                /*
                 * Keep the rest of the
                 * account information synced.
                 */

                user.name =
                    accountData.name ||
                    user.name ||
                    "";


                user.accountNumber =
    accountData.accountNumber || null;

user.accountAddress =
    accountData.accountAddress || "";

user.accountNumberApproved =
    accountData.accountNumberApproved === true;

user.accountNumberRequested =
    accountData.accountNumberRequested === true;

    updateReceiveCreditHomeUI();

                user.referralLink =
                    accountData.referralLink ||
                    user.referralLink ||
                    "";


                user.savings =
                    accountData.savings || {

                        amount: 0,

                        interest: 0,

                        dailyInterest: 0,

                        rate: 0,

                        createdAt: null,

                        lastInterestAt: null

                    };


                /*
                 * UPDATE THE UI IMMEDIATELY.
                 */

                updateBalanceUI();

                updateSavingsUI();

                updateUserUI();

                updateSavingsAccountStatus(
                    accountData
                );


                /*
                 * Keep local copy synchronized.
                 */

                saveAccount();

            },
            error => {

                console.error(
                    "Payza account realtime sync error:",
                    error
                );

            }
        );

}

function getSavingsProgress(
    savings = null
) {

    const currentSavings =
        savings ||
        user?.savings ||
        {};

    const savingsAmount =
        Number(
            currentSavings.amount || 0
        );

    const dailyInterest =
        Number(
            currentSavings.dailyInterest || 0
        );

    const lastInterestAt =
        Number(
            currentSavings.lastInterestAt || 0
        );

    if (
        savingsAmount <= 0 ||
        dailyInterest <= 0 ||
        !lastInterestAt
    ) {

        return 0;

    }

    const THREE_HOURS =
        3 * 60 * 60 * 1000;

    const EIGHT_BLOCKS =
        8;

    const elapsed =
        Math.max(
            0,
            Date.now() -
            lastInterestAt
        );

    /*
     * Only completed 3-hour blocks count.
     *
     * 0 blocks = 0%
     * 1 block  = 12.5%
     * 2 blocks = 25%
     * 3 blocks = 37.5%
     * 4 blocks = 50%
     * 5 blocks = 62.5%
     * 6 blocks = 75%
     * 7 blocks = 87.5%
     * 8 blocks = 100%
     */

    const completedBlocks =
        Math.min(
            EIGHT_BLOCKS,
            Math.floor(
                elapsed /
                THREE_HOURS
            )
        );

    const progress =
        (
            completedBlocks /
            EIGHT_BLOCKS
        ) *
        100;

    return progress;

}

/* =========================================================
   UPDATE PROGRESS POOL UI
========================================================= */

function updateSavingsProgressUI() {

    const progress =
        getSavingsProgress(
            user?.savings
        );


    /*
     * Support your existing progress elements.
     */

    const progressBar =
        document.getElementById(
            "savingsProgressBar"
        );


    const progressText =
        document.getElementById(
            "savingsProgressText"
        );


    const progressValue =
        document.getElementById(
            "savingsProgressValue"
        );


    if (progressBar) {

        progressBar.style.width =
            `${progress}%`;

    }


    if (progressText) {

        progressText.textContent =
            `${Math.floor(progress)}%`;

    }


    if (progressValue) {

        progressValue.textContent =
            `${Math.floor(progress)}%`;

    }

}


/* =========================================================
   CHECK EVERY MINUTE
========================================================= */

setInterval(
    () => {

        processSavingsInterest();

        updateSavingsProgressUI();

    },
    60 * 1000
);


/* =========================================================
   CHECK SHORTLY AFTER APP LOAD
========================================================= */

setTimeout(
    () => {

        processSavingsInterest();

        updateSavingsProgressUI();

    },
    1500
);

/* =========================================================
   PAYZA PWA INSTALL
========================================================= */

let deferredInstallPrompt = null;

const pwaInstallPrompt = document.getElementById("pwaInstallPrompt");
const pwaInstallBtn = document.getElementById("pwaInstallBtn");
const pwaInstallClose = document.getElementById("pwaInstallClose");

window.addEventListener("beforeinstallprompt", (event) => {

    event.preventDefault();

    deferredInstallPrompt = event;

    if (pwaInstallPrompt) {
        pwaInstallPrompt.classList.remove("hidden");
    }

});


if (pwaInstallBtn) {

    pwaInstallBtn.addEventListener("click", async () => {

        if (!deferredInstallPrompt) {
            return;
        }

        deferredInstallPrompt.prompt();

        const result = await deferredInstallPrompt.userChoice;

        if (result.outcome === "accepted") {

            pwaInstallPrompt.classList.add("hidden");

        }

        deferredInstallPrompt = null;

    });

}


if (pwaInstallClose) {

    pwaInstallClose.addEventListener("click", () => {

        pwaInstallPrompt.classList.add("hidden");

    });

}


window.addEventListener("appinstalled", () => {

    deferredInstallPrompt = null;

    if (pwaInstallPrompt) {
        pwaInstallPrompt.classList.add("hidden");
    }

});

/* =========================================================
   START PAYZA
========================================================= */

loadSavedAccount();

listenForPayzaAccount();

listenForPayzaCurrency();

listenForAccountNumberCost();