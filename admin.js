/* =========================================================
   PAYZA ADMIN DASHBOARD
   REALTIME CREDIT REQUEST SYSTEM
========================================================= */

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
    onSnapshot,
    serverTimestamp
} from "./firebase.js";



let payzaAdminCurrencySymbol = "₦";

async function loadPayzaCurrencySymbol() {

    try {

        const currencyRef =
            doc(
                db,
                "appSettings",
                "currency"
            );

        const snapshot =
            await getDoc(currencyRef);

        if (snapshot.exists()) {

            const data =
                snapshot.data();

            if (
                typeof data.symbol === "string" &&
                data.symbol.trim()
            ) {

                payzaAdminCurrencySymbol =
                    data.symbol.trim();

                externalCurrencySymbol =
                    data.symbol.trim();

            }

        }

    } catch (error) {

        console.error(
            "Currency setting load error:",
            error
        );

    }

}


/* =========================================================
   ADMIN CURRENCY SETTING UI
========================================================= */

function createPayzaCurrencySetting() {

    if (
        document.getElementById(
            "payzaCurrencySetting"
        )
    ) {
        return;
    }


    const container =
        document.querySelector(
            ".admin-main"
        );

    if (!container) return;


    const section =
        document.createElement("section");

    section.id =
        "payzaCurrencySetting";

    section.className =
        "admin-section";


    section.innerHTML = `

        <div class="page-heading">

            <div>

                <span class="heading-label">
                    SYSTEM SETTINGS
                </span>

                <h1>
                    Currency Symbol
                </h1>

                <p>
                    Change the currency symbol used throughout
                    the Payza user application.
                </p>

            </div>

        </div>


        <div
            style="
                background:#ffffff;
                border:1px solid #e4e7ec;
                border-radius:18px;
                padding:24px;
                max-width:520px;
                box-shadow:0 8px 25px rgba(16,24,40,.06);
            "
        >

            <label
                for="payzaCurrencySymbolInput"
                style="
                    display:block;
                    font-size:13px;
                    font-weight:700;
                    color:#344054;
                    margin-bottom:8px;
                "
            >
                Currency Symbol
            </label>


            <input
                id="payzaCurrencySymbolInput"
                type="text"
                maxlength="8"
                placeholder="₦"
                style="
                    width:100%;
                    height:48px;
                    box-sizing:border-box;
                    border:1px solid #d0d5dd;
                    border-radius:12px;
                    padding:0 14px;
                    font-size:20px;
                    font-weight:700;
                    color:#101828;
                    outline:none;
                    margin-bottom:14px;
                "
            >


            <button
                type="button"
                id="savePayzaCurrencySymbol"
                style="
                    width:100%;
                    height:48px;
                    border:0;
                    border-radius:12px;
                    background:#0b5ed7;
                    color:#ffffff;
                    font-size:15px;
                    font-weight:700;
                    cursor:pointer;
                "
            >
                Save Currency Symbol
            </button>


            <div
                id="payzaCurrencySaveStatus"
                style="
                    margin-top:12px;
                    font-size:13px;
                    font-weight:600;
                    color:#087443;
                    min-height:18px;
                "
            ></div>

        </div>

    `;


    container.prepend(section);


    const input =
        document.getElementById(
            "payzaCurrencySymbolInput"
        );

    const saveButton =
        document.getElementById(
            "savePayzaCurrencySymbol"
        );

    const status =
        document.getElementById(
            "payzaCurrencySaveStatus"
        );


    input.value =
    externalCurrencySymbol;


    saveButton.addEventListener(
        "click",
        async () => {

            const symbol =
                input.value.trim();


            if (!symbol) {

                status.textContent =
                    "Enter a currency symbol.";

                status.style.color =
                    "#b42318";

                return;

            }


            saveButton.disabled =
                true;

            saveButton.textContent =
                "Saving...";


            try {

                await setDoc(
                    doc(
                        db,
                        "systemSettings",
                        "currency"
                    ),
                    {
                        symbol:
                            symbol,

                        updatedAt:
                            serverTimestamp()
                    },
                    {
                        merge:true
                    }
                );


                payzaAdminCurrencySymbol =
    symbol;

externalCurrencySymbol =
    symbol;

updateCurrencyPreview();

renderRequestList();

renderRecentRequests();

renderApprovedRequests();

renderRejectedRequests();

renderWithdrawalList();

updateStatistics();


                status.textContent =
                    "Currency symbol saved successfully.";

                status.style.color =
                    "#087443";


            } catch (error) {

                console.error(
                    "Currency symbol save error:",
                    error
                );


                status.textContent =
                    "Unable to save currency symbol.";

                status.style.color =
                    "#b42318";

            } finally {

                saveButton.disabled =
                    false;

                saveButton.textContent =
                    "Save Currency Symbol";

            }

        }
    );

}

/* =========================================================
   START GLOBAL CURRENCY SETTING
========================================================= */

loadPayzaCurrencySymbol()
    .then(
        createPayzaCurrencySetting
    );

/* =========================================================
   GLOBAL ADMIN STATE
========================================================= */

/* =========================================================
   PAYZA CURRENCY & ACCOUNT SETTINGS
========================================================= */

let externalCurrencySymbol = "₦";

let accountNumberCost = 5000;

let allRequests = [];

let currentFilter = "all";

let currentSearch = "";

let confirmCallback = null;


/* =========================================================
   DOM ELEMENTS
========================================================= */

const requestList =
    document.getElementById("requestList");

const recentRequests =
    document.getElementById("recentRequests");

const approvedList =
    document.getElementById("approvedList");

const rejectedList =
    document.getElementById("rejectedList");

const usersList =
    document.getElementById("usersList");

const activityFeed =
    document.getElementById("activityFeed");

const fullActivityFeed =
    document.getElementById("fullActivityFeed");


const sidebarPendingCount =
    document.getElementById("sidebarPendingCount");

const pendingStat =
    document.getElementById("pendingStat");

const approvedStat =
    document.getElementById("approvedStat");

const rejectedStat =
    document.getElementById("rejectedStat");

const approvedAmountStat =
    document.getElementById("approvedAmountStat");


const requestSearch =
    document.getElementById("requestSearch");


const requestModal =
    document.getElementById("requestModal");

const closeRequestModal =
    document.getElementById("closeRequestModal");

const requestModalContent =
    document.getElementById("requestModalContent");


const confirmModal =
    document.getElementById("confirmModal");

const confirmTitle =
    document.getElementById("confirmTitle");

const confirmMessage =
    document.getElementById("confirmMessage");

const confirmIcon =
    document.getElementById("confirmIcon");

const confirmCancelBtn =
    document.getElementById("confirmCancelBtn");

const confirmActionBtn =
    document.getElementById("confirmActionBtn");


const adminToast =
    document.getElementById("adminToast");

const adminToastTitle =
    document.getElementById("adminToastTitle");

const adminToastMessage =
    document.getElementById("adminToastMessage");

    /* =========================================================
   CURRENCY SETTINGS DOM ELEMENTS
========================================================= */

const currencySymbolInput =
    document.getElementById(
        "currencySymbolInput"
    );


const accountNumberCostInput =
    document.getElementById(
        "accountNumberCostInput"
    );


const saveCurrencySettingsBtn =
    document.getElementById(
        "saveCurrencySettingsBtn"
    );


const currencySettingsStatus =
    document.getElementById(
        "currencySettingsStatus"
    );


const currencyPreviewBalance =
    document.getElementById(
        "currencyPreviewBalance"
    );


const currencyPreviewWithdrawal =
    document.getElementById(
        "currencyPreviewWithdrawal"
    );


const currencyPreviewAccountCost =
    document.getElementById(
        "currencyPreviewAccountCost"
    );

/* =========================================================
   FIRESTORE COLLECTIONS
========================================================= */

const creditRequestsRef =
    collection(db, "creditRequests");

const payzaAccountsRef =
    collection(db, "payzaAccounts");

    /* =========================================================
   PAYZA APP SETTINGS
========================================================= */

const payzaSettingsRef =
    doc(
        db,
        "appSettings",
        "currency"
    );

 /* =========================================================
   ACCOUNT NUMBER REQUESTS
========================================================= */

let allAccountNumberRequests = [];


/* =========================================================
   RENDER ACCOUNT NUMBER REQUESTS
========================================================= */

function renderAccountNumberRequests() {

    const list =
        document.getElementById(
            "accountNumberRequestList"
        );

    const pendingStat =
        document.getElementById(
            "pendingAccountNumberStat"
        );


    if (!list) {
        return;
    }


    const pending =
        allAccountNumberRequests.filter(
            request =>
                String(
                    request.status || "pending"
                ).toLowerCase() === "pending"
        );


    if (pendingStat) {

        pendingStat.textContent =
            pending.length;

    }


    if (!allAccountNumberRequests.length) {

        list.innerHTML = `

            <div class="empty-state">

                <div class="empty-icon">
                    #
                </div>

                <strong>
                    No Account Number requests
                </strong>

                <span>
                    New Account Number requests will appear here.
                </span>

            </div>

        `;

        return;

    }


    list.innerHTML =
        allAccountNumberRequests
            .map(
                request => {

                    const status =
                        String(
                            request.status ||
                            "pending"
                        ).toLowerCase();


                    const isPending =
                        status === "pending";


                    return `

                        <div class="request-card">

                            <div class="request-card-header">

                                <div>

                                    <span class="heading-label">
                                        ACCOUNT NUMBER REQUEST
                                    </span>

                                    <h3>
                                        ${escapeHTML(
                                            request.accountName ||
                                            "Account"
                                        )}
                                    </h3>

                                </div>


                                <span class="
                                    request-status
                                    ${status}
                                ">
                                    ${escapeHTML(
                                        status
                                    )}
                                </span>

                            </div>


                            <div class="request-card-body">

                                <div class="request-detail">

                                    <span>
                                        Device ID
                                    </span>

                                    <strong>
                                        ${escapeHTML(
                                            request.deviceId ||
                                            "—"
                                        )}
                                    </strong>

                                </div>


                                <div class="request-detail">

                                    <span>
                                        Request Type
                                    </span>

                                    <strong>
                                        Account Number
                                    </strong>

                                </div>


                                <div class="request-detail">

                                    <span>
                                        Payment Method
                                    </span>

                                    <strong>
                                        ${escapeHTML(
                                            request.paymentMethod ||
                                            "—"
                                        )}
                                    </strong>

                                </div>


                                <div class="request-detail">

                                    <span>
                                        Account Number Cost
                                    </span>

                                    <strong>
                                        ${formatMoney(
                                            Number(
                                                request.paymentCost ||
                                                0
                                            )
                                        )}
                                    </strong>

                                </div>

                            </div>


                            <div class="request-card-actions">

                                ${
                                    isPending
                                        ? `
                                            <button
                                                type="button"
                                                class="approve-btn"
                                                data-account-number-action="approve"
                                                data-id="${escapeHTML(
                                                    request.id
                                                )}"
                                            >
                                                Approve Account Number
                                            </button>
                                          `
                                        : `
                                            <span class="request-completed">
                                                Account Number ${status}
                                            </span>
                                          `
                                }

                            </div>

                        </div>

                    `;

                }
            )
            .join("");

}


/* =========================================================
   GENERATE UNIQUE PAYZA ACCOUNT NUMBER
========================================================= */

async function generateUniquePayzaAccountNumber() {

    let accountNumber;

    let exists = true;


    while (exists) {

        const randomNumber =
            Math.floor(
                1000000000 +
                Math.random() * 9000000000
            )
                .toString();


        accountNumber =
            `PAYZA-${randomNumber}`;


        const accountsSnapshot =
            await getDocs(
                collection(
                    db,
                    "payzaAccounts"
                )
            );


        exists =
            accountsSnapshot.docs.some(
                document => {

                    const data =
                        document.data();


                    return (
                        data.accountAddress ===
                            accountNumber ||

                        data.accountNumber ===
                            accountNumber
                    );

                }
            );

    }


    return accountNumber;

}


/* =========================================================
   APPROVE ACCOUNT NUMBER REQUEST
========================================================= */

async function approveAccountNumberRequest(
    request
) {

    if (
        !request ||
        !request.id ||
        !request.deviceId
    ) {

        showToast(
            "Approval Error",
            "The Account Number request is invalid."
        );

        return;

    }


    try {

        const accountRef =
            doc(
                db,
                "payzaAccounts",
                String(
                    request.deviceId
                )
            );


        const accountSnapshot =
            await getDoc(
                accountRef
            );


        if (!accountSnapshot.exists()) {

            throw new Error(
                "The user's Payza account could not be found."
            );

        }


        const accountData =
            accountSnapshot.data();


        if (
            accountData.accountNumberApproved === true &&
            accountData.accountNumber
        ) {

            await updateDoc(
                doc(
                    db,
                    "accountNumberRequests",
                    request.id
                ),
                {

                    status:
                        "approved",

                    accountNumber:
                        accountData.accountNumber,

                    accountNumberApproved:
                        true,

                    approvedAt:
                        serverTimestamp(),

                    updatedAt:
                        serverTimestamp()

                }
            );


            showToast(
                "Account Number Approved",
                "This user already has an Account Number."
            );

            return;

        }


        const accountNumber =
            await generateUniquePayzaAccountNumber();


        await updateDoc(
            accountRef,
            {

                accountNumber:
                    accountNumber,

                accountAddress:
                    accountNumber,

                accountNumberApproved:
                    true,

                accountNumberRequested:
                    true,

                updatedAt:
                    serverTimestamp()

            }
        );


        await updateDoc(
            doc(
                db,
                "accountNumberRequests",
                request.id
            ),
            {

                status:
                    "approved",

                accountNumber:
                    accountNumber,

                accountNumberApproved:
                    true,

                approvedAt:
                    serverTimestamp(),

                updatedAt:
                    serverTimestamp()

            }
        );


        await addActivity(
            "Account Number Approved",
            `${request.accountName || "Account"} was assigned ${accountNumber}.`
        );


        showToast(
            "Account Number Approved",
            `${accountNumber} has been assigned successfully.`
        );


    } catch (error) {

        console.error(
            "Account Number approval error:",
            error
        );


        showToast(
            "Approval Error",
            error.message ||
            "Unable to approve Account Number request."
        );

    }

}


/* =========================================================
   REALTIME ACCOUNT NUMBER REQUEST LISTENER
========================================================= */

function listenForAccountNumberRequests() {

    onSnapshot(
        collection(
            db,
            "accountNumberRequests"
        ),

        function (snapshot) {

            allAccountNumberRequests =
                snapshot.docs
                    .map(
                        function (document) {

                            return {

                                id:
                                    document.id,

                                ...document.data()

                            };

                        }
                    )
                    .sort(
                        function (a, b) {

                            return getRequestTime(b)
                                -
                                getRequestTime(a);

                        }
                    );


            renderAccountNumberRequests();

        },

        function (error) {

            console.error(
                "Account Number request listener error:",
                error
            );


            showToast(
                "Connection Error",
                "Unable to receive Account Number requests."
            );

        }
    );

}


/* =========================================================
   ACCOUNT NUMBER APPROVE BUTTON
========================================================= */

document.addEventListener(
    "click",
    function (event) {

        const button =
            event.target.closest(
                "[data-account-number-action]"
            );


        if (!button) {
            return;
        }


        const action =
            button.dataset.accountNumberAction;


        const id =
            button.dataset.id;


        const request =
            allAccountNumberRequests.find(
                item =>
                    item.id === id
            );


        if (!request) {
            return;
        }


        if (
            action === "approve"
        ) {

            openConfirmation(
                "Approve Account Number",
                `Approve an Account Number for ${request.accountName || "this account"}? A unique Payza Account Number will be generated and assigned to this device.`,
                function () {

                    return approveAccountNumberRequest(
                        request
                    );

                },
                "approve"
            );

        }

    }
);


/* =========================================================
   REALTIME ACCOUNT NUMBER REQUEST LISTENER
========================================================= */

function listenForAccountNumberRequests() {

    onSnapshot(
        accountNumberRequestsRef,

        function (snapshot) {

            allAccountNumberRequests =
                snapshot.docs.map(
                    function (document) {

                        return {

                            id:
                                document.id,

                            ...document.data()

                        };

                    }
                );


            allAccountNumberRequests.sort(
                function (a, b) {

                    return getRequestTime(b)
                        -
                        getRequestTime(a);

                }
            );


            console.log(
                "ACCOUNT NUMBER REQUESTS RECEIVED:",
                allAccountNumberRequests
            );


            renderAccountNumberRequests();

        },

        function (error) {

            console.error(
                "Account Number request listener error:",
                error
            );


            showToast(
                "Connection Error",
                "Unable to receive Account Number requests."
            );

        }
    );

}

/* =========================================================
   APPROVE ACCOUNT NUMBER REQUEST
========================================================= */

async function approveAccountNumberRequest(requestId) {

    if (!requestId) {

        throw new Error(
            "Account Number request ID is missing."
        );

    }


    const requestRef =
        doc(
            db,
            "accountNumberRequests",
            requestId
        );


    const requestSnapshot =
        await getDoc(requestRef);


    if (!requestSnapshot.exists()) {

        throw new Error(
            "Account Number request not found."
        );

    }


    const request =
        requestSnapshot.data();


    /*
     * Prevent approving the same request twice.
     */
    if (
        String(
            request.status || "pending"
        ).toLowerCase() !==
        "pending"
    ) {

        throw new Error(
            "This Account Number request has already been processed."
        );

    }


    const deviceId =
        request.deviceId;


    if (!deviceId) {

        throw new Error(
            "Device ID is missing from this Account Number request."
        );

    }


    /*
     * Find the EXACT Payza account belonging
     * to the requester.
     */
    const accountRef =
        doc(
            db,
            "payzaAccounts",
            deviceId
        );


    const accountSnapshot =
        await getDoc(accountRef);


    if (!accountSnapshot.exists()) {

        throw new Error(
            "Payza account for this requester was not found."
        );

    }


    const accountData =
        accountSnapshot.data();


    /*
     * Security verification.
     */
    if (
        accountData.deviceId &&
        accountData.deviceId !==
        deviceId
    ) {

        throw new Error(
            "Device verification failed."
        );

    }


    /*
     * If this device already has an approved
     * Account Number, use that same number.
     *
     * NEVER generate another number.
     */
    if (
        accountData.accountNumberApproved === true &&
        accountData.accountNumber
    ) {

        await updateDoc(
            requestRef,
            {

                status:
                    "approved",

                accountNumberApproved:
                    true,

                accountNumber:
                    accountData.accountNumber,

                approvedAt:
                    serverTimestamp(),

                updatedAt:
                    serverTimestamp()

            }
        );


        showToast(
            "Account Number Approved",
            `${accountData.accountNumber} is already assigned to this account.`
        );


        return;

    }


    /*
     * Generate a unique Account Number.
     */
    let accountNumber = null;


    for (
        let attempt = 0;
        attempt < 20;
        attempt++
    ) {

        const randomDigits =
            Math.floor(
                1000000000 +
                Math.random() * 9000000000
            ).toString();


        const candidate =
            `PAYZA-${randomDigits}`;


        const existingQuery =
            query(
                collection(
                    db,
                    "payzaAccounts"
                ),
                where(
                    "accountNumber",
                    "==",
                    candidate
                )
            );


        const existing =
            await getDocs(
                existingQuery
            );


        if (existing.empty) {

            accountNumber =
                candidate;

            break;

        }

    }


    if (!accountNumber) {

        throw new Error(
            "Unable to generate a unique Account Number."
        );

    }


    /*
     * =====================================================
     * SAVE ACCOUNT NUMBER TO EXACT USER ACCOUNT
     * =====================================================
     *
     * NO balance change.
     * NO credit added.
     * NO money added.
     */
    await updateDoc(
        accountRef,
        {

            accountNumber:
                accountNumber,

            accountNumberRequested:
                true,

            accountNumberApproved:
                true,

            accountNumberApprovedAt:
                serverTimestamp(),

            updatedAt:
                serverTimestamp()

        }
    );


    /*
     * =====================================================
     * APPROVE ONLY THIS REQUEST
     * =====================================================
     */
    await updateDoc(
        requestRef,
        {

            status:
                "approved",

            accountNumber:
                accountNumber,

            accountNumberApproved:
                true,

            approvedAt:
                serverTimestamp(),

            updatedAt:
                serverTimestamp()

        }
    );


    await addActivity(
        "Account Number Approved",
        `${request.accountName || request.userName || "Account"} was assigned Account Number ${accountNumber}.`
    );


    console.log(
        "ACCOUNT NUMBER GENERATED:",
        accountNumber,
        "FOR DEVICE:",
        deviceId,
        "REQUEST:",
        requestId
    );


    showToast(
        "Account Number Approved",
        `${accountNumber} has been generated and assigned to the requester.`
    );

}

/* =========================================================
   APPROVE CREDIT / ACCOUNT NUMBER REQUEST
========================================================= */

async function approveRequest(request) {

    try {

        if (!request) {

            showToast("Invalid request");

            return;

        }


        const requestId =
            request.id ||
            request.deviceId;


        const deviceId =
            request.deviceId;


        if (!deviceId) {

            showToast(
                "Request does not contain a device ID"
            );

            return;

        }


        /*
         * Get the exact Payza account belonging
         * to the device that created this request.
         */
        const accountRef =
            doc(
                db,
                "payzaAccounts",
                deviceId
            );


        const accountSnapshot =
            await getDoc(accountRef);


        if (!accountSnapshot.exists()) {

            showToast(
                "Payza account not found"
            );

            return;

        }


        const accountData =
            accountSnapshot.data();


        /*
         * Security check:
         * Make sure the account really belongs
         * to the device that created the request.
         */
        if (
            accountData.deviceId &&
            accountData.deviceId !== deviceId
        ) {

            showToast(
                "Account verification failed"
            );

            return;

        }


        /* =====================================================
           ACCOUNT NUMBER REQUEST
           ================================================ */

        if (
            request.transactionType ===
            "account_number_purchase" ||
            request.accountNumberPurchase === true
        ) {


            /*
             * IMPORTANT:
             *
             * If this Account Number has already
             * been approved, DO NOTHING.
             *
             * This prevents the same device from
             * generating another Account Number.
             */
            if (
                accountData.accountNumberApproved === true &&
                accountData.accountNumber
            ) {

                await updateDoc(
                    doc(
                        db,
                        "creditRequests",
                        requestId
                    ),
                    {

                        status:
                            "approved",

                        accountNumberApproved:
                            true,

                        accountNumber:
                            accountData.accountNumber,

                        approvedAt:
                            serverTimestamp(),

                        updatedAt:
                            serverTimestamp()

                    }
                );


                showToast(
                    "Account Number is already approved for this account"
                );

                return;

            }


            /*
             * Generate a unique Payza Account Number.
             *
             * Example:
             * PAYZA-7248540461
             */
            let accountNumber = null;


            for (
                let attempt = 0;
                attempt < 10;
                attempt++
            ) {

                const randomDigits =
                    Math.floor(
                        1000000000 +
                        Math.random() * 9000000000
                    ).toString();


                const candidate =
                    `PAYZA-${randomDigits}`;


                const existingQuery =
                    query(
                        collection(
                            db,
                            "payzaAccounts"
                        ),
                        where(
                            "accountNumber",
                            "==",
                            candidate
                        )
                    );


                const existing =
                    await getDocs(
                        existingQuery
                    );


                if (existing.empty) {

                    accountNumber =
                        candidate;

                    break;

                }

            }


            if (!accountNumber) {

                showToast(
                    "Unable to generate Account Number"
                );

                return;

            }


            /*
             * =================================================
             * ACCOUNT NUMBER APPROVAL ONLY
             * =================================================
             *
             * DO NOT:
             *
             * increment(balance)
             * add credit
             * approve credit amount
             * add purchased credit
             *
             * This update only belongs to the
             * Account Number request.
             */
            await updateDoc(
                accountRef,
                {

                    accountNumber:
                        accountNumber,

                    accountNumberApproved:
                        true,

                    accountNumberRequested:
                        true,

                    updatedAt:
                        serverTimestamp()

                }
            );


            /*
             * Mark ONLY this request as approved.
             */
            await updateDoc(
                doc(
                    db,
                    "creditRequests",
                    requestId
                ),
                {

                    status:
                        "approved",

                    transactionType:
                        "account_number_purchase",

                    accountNumberPurchase:
                        true,

                    accountNumberApproved:
                        true,

                    accountNumber:
                        accountNumber,

                    approvedAt:
                        serverTimestamp(),

                    updatedAt:
                        serverTimestamp()

                }
            );


            console.log(
                "Account Number approved:",
                accountNumber,
                "for device:",
                deviceId
            );


            showToast(
                "Account Number approved successfully"
            );


            return;

        }


        /* =====================================================
           NORMAL CREDIT PURCHASE
           ===================================================== */

        const amount =
            Number(
                request.creditAmount || 0
            );


        if (
            !Number.isFinite(amount) ||
            amount <= 0
        ) {

            showToast(
                "Invalid Credit amount"
            );

            return;

        }


        /*
         * ONLY NORMAL CREDIT PURCHASES
         * reach this point.
         *
         * This is the ONLY branch that
         * adds Credit to Available Balance.
         */
        await updateDoc(
            accountRef,
            {

                balance:
                    increment(amount),

                updatedAt:
                    serverTimestamp()

            }
        );


        /*
         * Mark the normal Credit Purchase
         * as approved.
         */
        await updateDoc(
            doc(
                db,
                "creditRequests",
                requestId
            ),
            {

                status:
                    "approved",

                approvedAmount:
                    amount,

                approvedAt:
                    serverTimestamp(),

                updatedAt:
                    serverTimestamp()

            }
        );


        console.log(
            "Credit purchase approved:",
            amount,
            "for device:",
            deviceId
        );


        showToast(
            "Credit approved successfully"
        );


    } catch (error) {

        console.error(
            "Approve request error:",
            error
        );


        showToast(
            "Unable to approve request"
        );

    }

}


/* =========================================================
   REJECT REQUEST
========================================================= */

async function rejectRequest(
    request
) {

    if (!request || !request.id) {
        return;
    }


    await updateDoc(
        doc(
            db,
            "creditRequests",
            request.id
        ),
        {

            status: "rejected",

            rejectedAt:
                serverTimestamp()

        }
    );


    await addActivity(
        "Credit Rejected",
        `${request.accountName || "Account"} credit request was rejected.`
    );


    showToast(
        "Request Rejected",
        "The credit request has been rejected."
    );

}


/* =========================================================
   DELETE REQUEST
========================================================= */

async function deleteRequest(request) {

    if (!request || !request.id) {

        showToast(
            "Delete Error",
            "The request ID could not be found."
        );

        return;

    }


    try {

        /* 
         * Use the exact Firestore document ID.
         */
        const requestRef =
            doc(
                db,
                "creditRequests",
                String(request.id)
            );


        /*
         * Delete the request.
         */
        await deleteDoc(
            requestRef
        );


        /*
         * Record admin activity.
         */
        await addActivity(
            "Request Deleted",
            `Credit request from ${request.accountName || "Account"} was deleted.`
        );


        /*
         * Tell the admin the deletion succeeded.
         */
        showToast(
            "Request Deleted",
            "The credit request has been removed."
        );


    } catch (error) {

        console.error(
            "Delete request error:",
            error
        );


        showToast(
            "Delete Error",
            error.message ||
            "The request could not be deleted."
        );


        /*
         * Re-throw so the confirmation handler
         * knows the operation failed.
         */
        throw error;

    }

}



/* =========================================================
   REQUEST BUTTON EVENTS
========================================================= */

document.addEventListener(
    "click",
    function (event) {

        const button =
            event.target.closest(
                "[data-action]"
            );


        if (!button) return;


        const action =
            button.dataset.action;

        const id =
            button.dataset.id;


        const request =
            allRequests.find(
                function (item) {

                    return item.id === id;

                }
            );


        if (!request) return;


        if (action === "view") {

            openRequestModal(
                request
            );

            return;

        }


        if (action === "approve") {

            openConfirmation(
                "Approve Credit Request",
                `Approve ${formatMoney(request.creditAmount)} for ${request.accountName || "this account"}? The amount will be added to the user's Available Balance.`,
                function () {

                    return approveRequest(
                        request
                    );

                },
                "approve"
            );

            return;

        }


        if (action === "reject") {

            openConfirmation(
                "Reject Credit Request",
                `Reject the credit request from ${request.accountName || "this account"}?`,
                function () {

                    return rejectRequest(
                        request
                    );

                }
            );

            return;

        }


       if (action === "delete") {

    openConfirmation(
        "Delete Credit Request",
        `Delete this request permanently from the Admin Dashboard?`,
        async function () {

            await deleteRequest(
                request
            );

        }
    );

    return;

}

    }
);


/* =========================================================
   REALTIME CREDIT REQUEST LISTENER
========================================================= */

function listenForCreditRequests() {

    onSnapshot(
        creditRequestsRef,
        function (snapshot) {

            allRequests =
                snapshot.docs.map(
                    function (document) {

                        return {

                            id:
                                document.id,

                            ...document.data()

                        };

                    }
                );


            allRequests.sort(
                function (a, b) {

                    return getRequestTime(b)
                        - getRequestTime(a);

                }
            );


            updateStatistics();

            renderRequestList();

            renderRecentRequests();

            renderApprovedRequests();

            renderRejectedRequests();

        },

        function (error) {

            console.error(
                "Credit request listener error:",
                error
            );

            showToast(
                "Connection Error",
                "Unable to receive credit requests in real time."
            );

        }
    );

}


/* =========================================================
   ACTIVITY
========================================================= */

async function addActivity(
    title,
    message
) {

    try {

        const activityRef =
            doc(
                db,
                "adminActivity",
                `${Date.now()}_${Math.random()
                    .toString(36)
                    .slice(2, 8)}`
            );


        await setDoc(
            activityRef,
            {

                title,

                message,

                createdAt:
                    serverTimestamp()

            }
        );

    } catch (error) {

        console.error(
            "Activity error:",
            error
        );

    }

}


/* =========================================================
   REALTIME ACTIVITY LISTENER
========================================================= */

function listenForActivity() {

    onSnapshot(
        collection(
            db,
            "adminActivity"
        ),
        function (snapshot) {

            const activities =
                snapshot.docs
                    .map(
                        function (document) {

                            return {

                                id:
                                    document.id,

                                ...document.data()

                            };

                        }
                    )
                    .sort(
                        function (a, b) {

                            return getRequestTime(b)
                                - getRequestTime(a);

                        }
                    );


            renderActivity(
                activities
            );

        },
        function (error) {

            console.error(
                "Activity listener error:",
                error
            );

        }
    );

}


/* =========================================================
   RENDER ACTIVITY
========================================================= */

function renderActivity(
    activities
) {

    const html =
        activities
            .slice(0, 10)
            .map(
                function (activity) {

                    return `

                        <div class="activity-item">

                            <div class="activity-icon">
                                ◷
                            </div>

                            <div>

                                <strong>
                                    ${escapeHTML(
                                        activity.title ||
                                        "Activity"
                                    )}
                                </strong>

                                <span>
                                    ${escapeHTML(
                                        activity.message ||
                                        ""
                                    )}
                                </span>

                                <small>
                                    ${formatDate(
                                        activity.createdAt
                                    )}
                                </small>

                            </div>

                        </div>

                    `;

                }
            )
            .join("");


    if (activityFeed) {

        activityFeed.innerHTML =
            html ||
            `

                <div class="empty-state small">

                    <div class="empty-icon">
                        ◷
                    </div>

                    <strong>
                        No activity
                    </strong>

                    <span>
                        Administrative activity will appear here.
                    </span>

                </div>

            `;

    }


    if (fullActivityFeed) {

        fullActivityFeed.innerHTML =
            html ||
            `

                <div class="empty-state large">

                    <div class="empty-icon">
                        ◷
                    </div>

                    <strong>
                        No activity
                    </strong>

                    <span>
                        Administrative activity will appear here.
                    </span>

                </div>

            `;

    }

}


/* =========================================================
   SEARCH
========================================================= */

if (requestSearch) {

    requestSearch.addEventListener(
        "input",
        function () {

            currentSearch =
                requestSearch.value.trim();

            renderRequestList();

        }
    );

}


/* =========================================================
   FILTERS
========================================================= */

document
    .querySelectorAll(".filter-btn")
    .forEach(
        function (button) {

            button.addEventListener(
                "click",
                function () {

                    document
                        .querySelectorAll(
                            ".filter-btn"
                        )
                        .forEach(
                            function (item) {

                                item.classList.remove(
                                    "active"
                                );

                            }
                        );


                    button.classList.add(
                        "active"
                    );


                    currentFilter =
                        button.dataset.filter ||
                        "all";


                    renderRequestList();

                }
            );

        }
    );

/* =========================================================
   PAGE NAVIGATION
   SETTINGS IS AN INDEPENDENT TOGGLE
   DOES NOT REMOVE OR RESET REQUEST CARDS
========================================================= */

const pageTitles = {

    dashboard: "Dashboard",

    requests: "Credit Requests",

    accountNumberRequests:
        "Account Number Requests",

    withdrawals: "Withdrawal Requests",

    approved: "Approved Requests",

    rejected: "Rejected Requests",

    users: "Accounts",

    activity: "Activity",

    settings: "Currency & Account Settings"

};


/*
 * Remember the section that was open before
 * Settings was opened.
 */
let previousActiveSection = null;


/*
 * Check which normal admin section is currently open.
 */
function getCurrentActiveSection() {

    const activeSection =
        document.querySelector(
            ".admin-section.active-section"
        );


    if (!activeSection) {
        return null;
    }


    return activeSection;

}


/*
 * Open Settings.
 *
 * IMPORTANT:
 * This does NOT remove the active state from
 * Credit Requests, Withdrawal Requests, Approved,
 * Rejected, Users, Dashboard, or Activity.
 */
function openSettingsSection() {

    const settingsSection =
        document.getElementById(
            "settingsSection"
        );


    if (!settingsSection) {

        console.error(
            "settingsSection was not found in the HTML."
        );

        return;

    }


    /*
     * Remember whatever section/card was open
     * before Settings was opened.
     */
    if (!previousActiveSection) {

        previousActiveSection =
            getCurrentActiveSection();

    }


    /*
     * Open Settings only.
     *
     * Do NOT remove active-section from
     * the other sections.
     */
    settingsSection.classList.add(
        "active-section"
    );


    /*
     * Settings navigation item becomes active.
     */
    document
        .querySelectorAll(
            "[data-section]"
        )
        .forEach(
            function (button) {

                button.classList.remove(
                    "active"
                );

            }
        );


    const settingsButton =
        document.querySelector(
            '[data-section="settingsSection"]'
        );


    if (settingsButton) {

        settingsButton.classList.add(
            "active"
        );

    }


    const title =
        document.getElementById(
            "pageTitle"
        );


    if (title) {

        title.textContent =
            pageTitles.settings;

    }

}


/*
 * Close Settings.
 *
 * Restore the EXACT section that was open
 * before Settings was clicked.
 */
function closeSettingsSection() {

    const settingsSection =
        document.getElementById(
            "settingsSection"
        );


    if (settingsSection) {

        settingsSection.classList.remove(
            "active-section"
        );

    }


    /*
     * Restore the previous section.
     */
    if (previousActiveSection) {

        previousActiveSection.classList.add(
            "active-section"
        );


        /*
         * Restore the correct navigation button.
         */
        const sectionId =
            previousActiveSection.id;


        const sectionName =
            sectionId.endsWith("Section")
                ? sectionId.slice(
                    0,
                    -"Section".length
                )
                : sectionId;


        document
            .querySelectorAll(
                "[data-section]"
            )
            .forEach(
                function (button) {

                    button.classList.remove(
                        "active"
                    );

                }
            );


        const previousButton =
            document.querySelector(
                `[data-section="${sectionName}"]`
            );


        if (previousButton) {

            previousButton.classList.add(
                "active"
            );

        }


        const title =
            document.getElementById(
                "pageTitle"
            );


        if (title) {

            title.textContent =
                pageTitles[
                    sectionName
                ] ||
                "Dashboard";

        }

    }


    /*
     * Forget the previous section only AFTER
     * it has been restored.
     */
    previousActiveSection = null;

}


/*
 * Normal section navigation.
 */
function openNormalAdminSection(
    section
) {

    /*
     * If Settings is currently open,
     * close it first.
     */
    const settingsSection =
        document.getElementById(
            "settingsSection"
        );


    if (
        settingsSection &&
        settingsSection.classList.contains(
            "active-section"
        )
    ) {

        settingsSection.classList.remove(
            "active-section"
        );

        previousActiveSection = null;

    }


    /*
     * Convert navigation value into
     * the actual HTML section ID.
     *
     * Example:
     *
     * requests
     * ->
     * requestsSection
     */
    const targetId =
        section.endsWith("Section")
            ? section
            : `${section}Section`;


    const target =
        document.getElementById(
            targetId
        );


    if (!target) {

        console.error(
            "Admin section not found:",
            targetId
        );

        return;

    }


    /*
     * ONLY normal navigation changes
     * the visible admin section.
     */
    document
        .querySelectorAll(
            ".admin-section"
        )
        .forEach(
            function (page) {

                page.classList.remove(
                    "active-section"
                );

            }
        );


    target.classList.add(
        "active-section"
    );


    /*
     * Update navigation active state.
     */
    document
        .querySelectorAll(
            "[data-section]"
        )
        .forEach(
            function (button) {

                button.classList.remove(
                    "active"
                );

            }
        );


    const activeButton =
        document.querySelector(
            `[data-section="${section}"]`
        );


    if (activeButton) {

        activeButton.classList.add(
            "active"
        );

    }


    /*
     * Update page title.
     */
    const title =
        document.getElementById(
            "pageTitle"
        );


    if (title) {

        title.textContent =
            pageTitles[
                section.replace(
                    "Section",
                    ""
                )
            ] ||
            "Dashboard";

    }

}


/*
 * Navigation click handlers.
 */
document
    .querySelectorAll(
        "[data-section]"
    )
    .forEach(
        function (item) {

            item.addEventListener(
                "click",
                function (event) {

                    event.preventDefault();


                    const section =
                        item.dataset.section;


                    if (!section) {
                        return;
                    }


                    /*
                     * SETTINGS IS A TOGGLE.
                     *
                     * Clicking it once opens Settings.
                     *
                     * Clicking it again closes Settings
                     * and restores the previous card.
                     */
                    if (
                        section ===
                        "settingsSection"
                    ) {

                        const settingsSection =
                            document.getElementById(
                                "settingsSection"
                            );


                        if (
                            settingsSection &&
                            settingsSection.classList.contains(
                                "active-section"
                            )
                        ) {

                            closeSettingsSection();

                        } else {

                            openSettingsSection();

                        }


                        return;

                    }


                    /*
                     * Every other navigation item
                     * behaves normally.
                     */
                    openNormalAdminSection(
                        section
                    );

                }
            );

        }
    );


/* =========================================================
   VIEW ALL REQUESTS
========================================================= */

const viewAllRequestsBtn =
    document.getElementById(
        "viewAllRequestsBtn"
    );


if (viewAllRequestsBtn) {

    viewAllRequestsBtn.addEventListener(
        "click",
        function () {

            const requestsButton =
                document.querySelector(
                    '[data-section="requests"]'
                );


            if (requestsButton) {

                requestsButton.click();

            }

        }
    );

}


/* =========================================================
   NOTIFICATIONS
========================================================= */

const notificationBtn =
    document.getElementById(
        "notificationBtn"
    );


if (notificationBtn) {

    notificationBtn.addEventListener(
        "click",
        function () {

            const pending =
                allRequests.filter(
                    function (request) {

                        return String(
                            request.status ||
                            "pending"
                        ).toLowerCase() ===
                            "pending";

                    }
                );


            if (pending.length) {

                showToast(
                    "Pending Requests",
                    `${pending.length} request${pending.length === 1 ? "" : "s"} waiting for review.`
                );

            } else {

                showToast(
                    "Notifications",
                    "There are no pending credit requests."
                );

            }

        }
    );

}


/* =========================================================
   START REALTIME SYSTEM
========================================================= */

listenForCreditRequests();

listenForWithdrawalRequests();

listenForAccountNumberRequests();

listenForActivity();


console.log(
    "Payza Admin Dashboard initialized."
);