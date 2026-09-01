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

const accountNumberRequestsRef =
    collection(
        db,
        "accountNumberRequests"
    );

let allAccountNumberRequests = [];

    /* =========================================================
   WITHDRAWAL REQUESTS
========================================================= */

const withdrawalRequestsRef =
    collection(db, "withdrawalRequests");


let allWithdrawalRequests = [];

let currentWithdrawalFilter = "all";

let currentWithdrawalSearch = "";


/* =========================================================
   WITHDRAWAL DOM ELEMENTS
========================================================= */

const withdrawalList =
    document.getElementById("withdrawalList");

const pendingWithdrawalStat =
    document.getElementById(
        "pendingWithdrawalStat"
    );

    const pendingWithdrawalSidebarCount =
    document.getElementById(
        "pendingWithdrawalSidebarCount"
    );

const withdrawalSearch =
    document.getElementById(
        "withdrawalSearch"
    );


function createWithdrawalCard(request) {

    const status =
        String(
            request.status || "pending"
        ).toLowerCase();


    const isPending =
        status === "pending";


    const amount =
        Number(
            request.withdrawalAmount ??
            request.amount ??
            0
        );


    const fee =
        Number(
            request.withdrawalFee ??
            amount * 0.05
        );


    const amountReceived =
        Number(
            request.amountReceived ??
            (amount - fee)
        );


    const customerName =
        request.accountName ||
        request.userName ||
        "Unknown User";


    const bankName =
        request.bankName ||
        "Not provided";


    const accountNumber =
        request.bankAccountNumber ||
        request.accountNumber ||
        "Not provided";


    const bankAccountName =
        request.bankAccountName ||
        request.accountName ||
        "Not provided";


    const card =
        document.createElement("div");


    card.className =
        "request-card";


    card.dataset.withdrawalId =
        request.id || "";


    card.innerHTML = `

        <div class="request-card-top">

            <div class="request-user">

                <div class="request-avatar">

                    ${escapeHTML(
                        String(
                            customerName
                        )
                            .charAt(0)
                            .toUpperCase()
                    )}

                </div>

                <div>

                    <strong>
                        ${escapeHTML(
                            customerName
                        )}
                    </strong>

                    <span>
                        ${escapeHTML(
                            request.accountAddress ||
                            request.deviceId ||
                            "Payza Account"
                        )}
                    </span>

                </div>

            </div>

            ${statusBadge(status)}

        </div>


        <div class="request-card-main">

            <div class="request-info">

                <span>
                    Amount to Withdraw
                </span>

                <strong>
                    ${formatExternalMoney(amount)}
            </strong>

            </div>


            <div class="request-info">

                <span>
                    Withdrawal Fee
                </span>

                <strong>
                  ${formatExternalMoney(fee)}
          </strong>

            </div>


            <div class="request-info">

                <span>
                    Amount Received
                </span>

                <strong>
              ${formatExternalMoney(amountReceived)}
          </strong>

            </div>


            <div class="request-info">

                <span>
                    Bank Name
                </span>

                <strong>
                    ${escapeHTML(
                        bankName
                    )}
                </strong>

            </div>


            <div class="request-info">

                <span>
                    Account Number
                </span>

                <strong>
                    ${escapeHTML(
                        accountNumber
                    )}
                </strong>

            </div>


            <div class="request-info">

                <span>
                    Account Name
                </span>

                <strong>
                    ${escapeHTML(
                        bankAccountName
                    )}
                </strong>

            </div>

        </div>


        <div class="request-card-details">

            <div>

                <span>
                    Device ID
                </span>

                <strong class="device-value">
                    ${escapeHTML(
                        request.deviceId ||
                        "Unknown"
                    )}
                </strong>

            </div>


            <div>

                <span>
                    Requested
                </span>

                <strong>
                    ${formatDate(
                        request.createdAt ||
                        request.requestedAt
                    )}
                </strong>

            </div>

        </div>


        <div class="request-card-actions">

            ${
                isPending
                    ? `
                        <button
                            class="request-approve-btn"
                            data-withdrawal-action="approve"
                            data-id="${escapeHTML(
                                request.id
                            )}"
                        >
                            Approve
                        </button>

                        <button
                            class="request-reject-btn"
                            data-withdrawal-action="reject"
                            data-id="${escapeHTML(
                                request.id
                            )}"
                        >
                            Reject
                        </button>
                    `
                    : ""
            }


            <button
                class="request-delete-btn"
                data-withdrawal-action="delete"
                data-id="${escapeHTML(
                    request.id
                )}"
            >
                Delete
            </button>

        </div>

    `;


    return card;

}


/* =========================================================
   FILTER WITHDRAWALS
========================================================= */

function getFilteredWithdrawalRequests() {

    let requests =
        [...allWithdrawalRequests];


    if (
        currentWithdrawalFilter !==
        "all"
    ) {

        requests =
            requests.filter(
                function (request) {

                    return String(
                        request.status ||
                        "pending"
                    ).toLowerCase() ===
                        currentWithdrawalFilter;

                }
            );

    }


    if (currentWithdrawalSearch) {

        const search =
            currentWithdrawalSearch
                .toLowerCase();


        requests =
            requests.filter(
                function (request) {

                    return [

                        request.accountName,

                        request.userName,

                        request.bankName,

                        request.accountNumber,

                        request.deviceId,

                        request.accountAddress

                    ]
                        .filter(Boolean)
                        .some(
                            function (value) {

                                return String(value)
                                    .toLowerCase()
                                    .includes(search);

                            }
                        );

                }
            );

    }


    return requests;

}


/* =========================================================
   RENDER WITHDRAWALS
========================================================= */

function renderWithdrawalList() {

    if (!withdrawalList) return;


    const requests =
        getFilteredWithdrawalRequests();


    if (!requests.length) {

        withdrawalList.innerHTML = `

            <div class="empty-state large">

                <div class="empty-icon">
             ${escapeHTML(externalCurrencySymbol)}
       </div>

                <strong>
                    No withdrawal requests
                </strong>

                <span>
                    Customer withdrawal requests will appear here.
                </span>

            </div>

        `;

        return;

    }


    withdrawalList.innerHTML = "";


    requests.forEach(
        function (request) {

            withdrawalList.appendChild(
                createWithdrawalCard(request)
            );

        }
    );

}


/* =========================================================
   UPDATE WITHDRAWAL STATISTICS
========================================================= */

function updateWithdrawalStatistics() {

    const pending =
        allWithdrawalRequests.filter(
            function (request) {

                return String(
                    request.status ||
                    "pending"
                ).toLowerCase() ===
                    "pending";

            }
        );


    if (pendingWithdrawalStat) {

        pendingWithdrawalStat.textContent =
            pending.length;

    }


    if (pendingWithdrawalSidebarCount) {

        pendingWithdrawalSidebarCount.textContent =
            pending.length;

    }

}


/* =========================================================
   APPROVE WITHDRAWAL
========================================================= */

async function approveWithdrawal(request) {

    if (!request || !request.id) {

        throw new Error(
            "Withdrawal request ID is missing."
        );

    }


    if (!request.deviceId) {

        throw new Error(
            "This withdrawal request does not contain a device ID."
        );

    }


    const requestRef =
        doc(
            db,
            "withdrawalRequests",
            request.id
        );


    const requestSnapshot =
        await getDoc(requestRef);


    if (!requestSnapshot.exists()) {

        throw new Error(
            "Withdrawal request no longer exists."
        );

    }


    const currentRequest =
        requestSnapshot.data();


    if (
        String(
            currentRequest.status ||
            "pending"
        ).toLowerCase() !==
        "pending"
    ) {

        throw new Error(
            "This withdrawal request has already been processed."
        );

    }


    const accountRef =
        doc(
            db,
            "payzaAccounts",
            request.deviceId
        );


    const accountSnapshot =
        await getDoc(accountRef);


    if (!accountSnapshot.exists()) {

        throw new Error(
            "Payza account for this device was not found."
        );

    }


    const accountData =
        accountSnapshot.data();


    /*
     * Security check:
     * The withdrawal must belong to
     * this exact Payza device.
     */

    if (
        accountData.deviceId &&
        accountData.deviceId !==
        request.deviceId
    ) {

        throw new Error(
            "Device verification failed."
        );

    }


    const amount =
        Number(
            currentRequest.amount ||
            currentRequest.withdrawalAmount ||
            0
        );


    if (
        !Number.isFinite(amount) ||
        amount <= 0
    ) {

        throw new Error(
            "Invalid withdrawal amount."
        );

    }


    const currentBalance =
        Number(
            accountData.balance || 0
        );


    /*
     * Make sure the user's balance
     * is still sufficient.
     */

    if (
        currentBalance <
        amount
    ) {

        throw new Error(
            "The user's available balance is insufficient for this withdrawal."
        );

    }


    /*
     * Deduct the approved withdrawal
     * from the EXACT user's device account.
     */

    await updateDoc(
        accountRef,
        {

            balance:
                increment(-amount),

            updatedAt:
                serverTimestamp()

        }
    );


    /*
     * Mark ONLY this withdrawal request
     * as approved.
     */

    await updateDoc(
        requestRef,
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


    await addActivity(
        "Withdrawal Approved",
        `${currentRequest.accountName || currentRequest.userName || "Account"} withdrawal of ${formatExternalMoney(amount)} was approved for device ${request.deviceId}.`
    );


    showToast(
        "Withdrawal Approved",
        "The withdrawal has been approved successfully."
    );

}


/* =========================================================
   REJECT WITHDRAWAL
========================================================= */

async function rejectWithdrawal(request) {

    if (!request || !request.id) {

        throw new Error(
            "Withdrawal request ID is missing."
        );

    }


    await updateDoc(
        doc(
            db,
            "withdrawalRequests",
            request.id
        ),
        {

            status:
                "rejected",

            rejectedAt:
                serverTimestamp(),

            updatedAt:
                serverTimestamp()

        }
    );


    await addActivity(
        "Withdrawal Rejected",
        `${request.accountName || request.userName || "Account"} withdrawal request was rejected.`
    );


    showToast(
        "Withdrawal Rejected",
        "The withdrawal request has been rejected."
    );

}


/* =========================================================
   DELETE WITHDRAWAL
========================================================= */

async function deleteWithdrawal(request) {

    if (!request || !request.id) {

        throw new Error(
            "Withdrawal request ID is missing."
        );

    }


    await deleteDoc(
        doc(
            db,
            "withdrawalRequests",
            request.id
        )
    );


    await addActivity(
        "Withdrawal Deleted",
        `${request.accountName || request.userName || "Account"} withdrawal request was deleted.`
    );


    showToast(
        "Withdrawal Deleted",
        "The withdrawal request has been removed."
    );

}


/* =========================================================
   WITHDRAWAL BUTTON EVENTS
========================================================= */

document.addEventListener(
    "click",
    function (event) {

        const button =
            event.target.closest(
                "[data-withdrawal-action]"
            );


        if (!button) return;


        const action =
            button.dataset.withdrawalAction;


        const id =
            button.dataset.id;


        const request =
            allWithdrawalRequests.find(
                function (item) {

                    return item.id === id;

                }
            );


        if (!request) return;


        if (action === "approve") {

            openConfirmation(
                "Approve Withdrawal",
               `Approve the ${formatExternalMoney(Number(request.amount || request.withdrawalAmount || 0))} withdrawal for ${request.accountName || request.userName || "this user"}? The amount will be deducted from the user's Available Balance.`,
                function () {

                    return approveWithdrawal(
                        request
                    );

                },
                "approve"
            );

            return;

        }


        if (action === "reject") {

            openConfirmation(
                "Reject Withdrawal",
                `Reject the withdrawal request from ${request.accountName || request.userName || "this user"}?`,
                function () {

                    return rejectWithdrawal(
                        request
                    );

                }
            );

            return;

        }


        if (action === "delete") {

            openConfirmation(
                "Delete Withdrawal",
                "Delete this withdrawal request permanently from the Admin Dashboard?",
                function () {

                    return deleteWithdrawal(
                        request
                    );

                }
            );

        }

    }
);


/* =========================================================
   REALTIME WITHDRAWAL REQUEST LISTENER
========================================================= */

function listenForWithdrawalRequests() {

    console.log(
        "========================================"
    );

    console.log(
        "STARTING WITHDRAWAL REQUEST LISTENER"
    );

    console.log(
        "Firestore collection: withdrawalRequests"
    );

    console.log(
        "withdrawalRequestsRef:",
        withdrawalRequestsRef
    );


    onSnapshot(
        withdrawalRequestsRef,

        function (snapshot) {

            console.log(
                "========================================"
            );

            console.log(
                "WITHDRAWAL SNAPSHOT RECEIVED"
            );

            console.log(
                "DOCUMENT COUNT:",
                snapshot.size
            );


            allWithdrawalRequests =
                snapshot.docs.map(
                    function (document) {

                        const data =
                            document.data();


                        console.log(
                            "WITHDRAWAL DOCUMENT RECEIVED:",
                            document.id,
                            data
                        );


                        return {

                            id:
                                document.id,

                            ...data

                        };

                    }
                );


            allWithdrawalRequests.sort(
                function (a, b) {

                    return getRequestTime(b)
                        -
                        getRequestTime(a);

                }
            );


            console.log(
                "TOTAL WITHDRAWAL REQUESTS:",
                allWithdrawalRequests.length
            );


            console.log(
                "WITHDRAWAL REQUESTS:",
                allWithdrawalRequests
            );


            updateWithdrawalStatistics();

            renderWithdrawalList();


            console.log(
                "WITHDRAWAL LIST RENDERED"
            );

        },

        function (error) {

            console.error(
                "========================================"
            );

            console.error(
                "WITHDRAWAL LISTENER ERROR"
            );

            console.error(
                "ERROR CODE:",
                error?.code
            );

            console.error(
                "ERROR MESSAGE:",
                error?.message
            );

            console.error(
                "FULL ERROR:",
                error
            );


            if (withdrawalList) {

                withdrawalList.innerHTML = `

                    <div class="empty-state large">

                        <div class="empty-icon">
                            !
                        </div>

                        <strong>
                            Unable to load withdrawal requests
                        </strong>

                        <span>
                            ${escapeHTML(
                                error?.message ||
                                "Unable to connect to withdrawal requests."
                            )}
                        </span>

                    </div>

                `;

            }


            showToast(
                "Withdrawal Connection Error",
                error?.message ||
                "Unable to receive withdrawal requests."
            );

        }
    );

}


/* =========================================================
   WITHDRAWAL SEARCH
========================================================= */

if (withdrawalSearch) {

    withdrawalSearch.addEventListener(
        "input",
        function () {

            currentWithdrawalSearch =
                withdrawalSearch.value.trim();


            renderWithdrawalList();

        }
    );

}


/* =========================================================
   WITHDRAWAL FILTERS
========================================================= */

document
    .querySelectorAll(
        ".withdrawal-filter-btn"
    )
    .forEach(
        function (button) {

            button.addEventListener(
                "click",
                function () {

                    document
                        .querySelectorAll(
                            ".withdrawal-filter-btn"
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


                    currentWithdrawalFilter =
                        button.dataset.filter ||
                        "all";


                    renderWithdrawalList();

                }
            );

        }
    );

/* =========================================================
   HELPERS
========================================================= */

function escapeHTML(value) {

    if (value === null || value === undefined) {
        return "";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function formatMoney(value) {

    const number =
        Number(value) || 0;

    return `${externalCurrencySymbol}${number.toLocaleString(
        "en-US",
        {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }
    )}`;
}

function formatExternalMoney(value) {

    const number =
        Number(value) || 0;

    return `${externalCurrencySymbol}${number.toLocaleString(
        "en-US",
        {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }
    )}`;

}

function formatDate(timestamp) {

    if (!timestamp) {
        return "Just now";
    }

    try {

        const date =
            timestamp.toDate
                ? timestamp.toDate()
                : new Date(timestamp);

        return date.toLocaleString(
            "en-US",
            {
                dateStyle: "medium",
                timeStyle: "short"
            }
        );

    } catch {

        return "Just now";

    }
}


function getRequestTime(request) {

    if (!request.createdAt) {
        return 0;
    }

    try {

        if (request.createdAt.toMillis) {
            return request.createdAt.toMillis();
        }

        return new Date(
            request.createdAt
        ).getTime();

    } catch {

        return 0;

    }
}


function showToast(
    title,
    message
) {

    if (!adminToast) return;

    if (adminToastTitle) {
        adminToastTitle.textContent = title;
    }

    if (adminToastMessage) {
        adminToastMessage.textContent = message;
    }

    adminToast.classList.add("show");

    setTimeout(
        function () {

            adminToast.classList.remove("show");

        },
        3500
    );
}

/* =========================================================
   CURRENCY SETTINGS
========================================================= */

function updateCurrencyPreview() {

    const symbol =
        currencySymbolInput?.value.trim() ||
        externalCurrencySymbol ||
        "₦";


    const cost =
        Number(
            accountNumberCostInput?.value
        );


    if (currencyPreviewBalance) {

        currencyPreviewBalance.textContent =
            `${symbol}206,328.13`;

    }


    if (currencyPreviewWithdrawal) {

        currencyPreviewWithdrawal.textContent =
            `${symbol}206,328.13`;

    }


    if (currencyPreviewAccountCost) {

        currencyPreviewAccountCost.textContent =
            `${symbol}${(
                Number.isFinite(cost)
                    ? cost
                    : accountNumberCost
            ).toLocaleString(
                "en-US",
                {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                }
            )}`;

    }

}


/* =========================================================
   LOAD CURRENCY SETTINGS
========================================================= */

async function loadCurrencySettings() {

    try {

        const snapshot =
            await getDoc(
                payzaSettingsRef
            );


        if (snapshot.exists()) {

            const data =
                snapshot.data();


            if (
                typeof data.symbol ===
                "string" &&
                data.symbol.trim()
            ) {

                externalCurrencySymbol =
                    data.symbol.trim();

            }


            if (
                Number.isFinite(
                    Number(
                        data.accountNumberCost
                    )
                )
            ) {

                accountNumberCost =
                    Number(
                        data.accountNumberCost
                    );

            }

        }


        if (currencySymbolInput) {

            currencySymbolInput.value =
                externalCurrencySymbol;

        }


        if (accountNumberCostInput) {

            accountNumberCostInput.value =
                accountNumberCost;

        }


        updateCurrencyPreview();


        console.log(
            "Currency settings loaded:",
            {
                symbol:
                    externalCurrencySymbol,

                accountNumberCost:
                    accountNumberCost
            }
        );

    } catch (error) {

        console.error(
            "Unable to load currency settings:",
            error
        );


        showToast(
            "Settings Error",
            "Unable to load currency settings."
        );

    }

}


async function saveCurrencySettings() {

    try {

        const currencySymbolInput =
            document.getElementById(
                "currencySymbolInput"
            );

        const accountNumberCostInput =
            document.getElementById(
                "accountNumberCostInput"
            );


        if (!currencySymbolInput) {
            return;
        }


        const symbol =
            currencySymbolInput.value.trim();


        const newAccountNumberCost =
            Number(
                accountNumberCostInput?.value
            );


        if (!symbol) {

            alert(
                "Please enter a currency symbol."
            );

            return;

        }


        if (
            !Number.isFinite(
                newAccountNumberCost
            ) ||
            newAccountNumberCost < 0
        ) {

            alert(
                "Please enter a valid Account Number Cost."
            );

            return;

        }


        /* =========================================
           SAVE BOTH SETTINGS TO FIREBASE
        ========================================= */

        await setDoc(
            doc(
                db,
                "appSettings",
                "currency"
            ),
            {

                symbol:
                    symbol,

                accountNumberCost:
                    newAccountNumberCost,

                updatedAt:
                    serverTimestamp()

            },
            {
                merge: true
            }
        );


        /* =========================================
           UPDATE CURRENT ADMIN VALUES
        ========================================= */

        externalCurrencySymbol =
            symbol;

        accountNumberCost =
            newAccountNumberCost;


        /* =========================================
           SAVE LOCALLY
        ========================================= */

        localStorage.setItem(
            "payzaCurrencySymbol",
            symbol
        );

        localStorage.setItem(
            "payzaAccountNumberCost",
            String(
                newAccountNumberCost
            )
        );


        /* =========================================
           UPDATE PREVIEW IMMEDIATELY
        ========================================= */

        updateCurrencyPreview();


        /* =========================================
           NOTIFY OTHER PAYZA UI
        ========================================= */

        window.payzaCurrencySymbol =
            symbol;

        window.payzaAccountNumberCost =
            newAccountNumberCost;


        window.dispatchEvent(
            new CustomEvent(
                "payzaCurrencyChanged",
                {
                    detail: {

                        symbol:
                            symbol,

                        accountNumberCost:
                            newAccountNumberCost

                    }
                }
            )
        );


        alert(
            "Currency and Account Number Cost updated successfully."
        );


    } catch (error) {

        console.error(
            "Currency and Account Number settings update error:",
            error
        );


        alert(
            "Unable to update Currency and Account Number Cost."
        );

    }

}


/* =========================================================
   CURRENCY SETTINGS INPUT PREVIEW
========================================================= */

if (currencySymbolInput) {

    currencySymbolInput.addEventListener(
        "input",
        function () {

            updateCurrencyPreview();

        }
    );

}


if (accountNumberCostInput) {

    accountNumberCostInput.addEventListener(
        "input",
        function () {

            updateCurrencyPreview();

        }
    );

}


/* =========================================================
   SAVE CURRENCY SETTINGS BUTTON
========================================================= */

if (saveCurrencySettingsBtn) {

    saveCurrencySettingsBtn.addEventListener(
        "click",
        function () {

            saveCurrencySettings();

        }
    );

}


/* =========================================================
   LOAD SETTINGS WHEN ADMIN OPENS
========================================================= */

loadCurrencySettings();

/* =========================================================
   STATUS BADGE
========================================================= */

function statusBadge(status) {

    const safeStatus =
        String(status || "pending")
            .toLowerCase();

    if (safeStatus === "approved") {

        return `
            <span class="request-status approved">
                APPROVED
            </span>
        `;

    }

    if (safeStatus === "rejected") {

        return `
            <span class="request-status rejected">
                REJECTED
            </span>
        `;

    }

    return `
        <span class="request-status pending">
            PENDING
        </span>
    `;
}


/* =========================================================
   PAYMENT METHOD
========================================================= */

function paymentMethodLabel(method) {

    const value =
        String(method || "Bank Transfer");

    if (
        value.toLowerCase()
            .includes("crypto")
    ) {

        return `
            <span class="payment-method crypto">
                Pay With Crypto
            </span>
        `;

    }

    return `
        <span class="payment-method bank">
            Bank Transfer
        </span>
    `;
}


/* =========================================================
   REQUEST CARD
========================================================= */

function createRequestCard(request) {

    const status =
        String(request.status || "pending")
            .toLowerCase();

    const isPending =
        status === "pending";


    const card =
        document.createElement("div");

    card.className =
        "request-card";


    card.dataset.requestId =
        request.id || "";


    card.innerHTML = `

        <div class="request-card-top">

            <div class="request-user">

                <div class="request-avatar">

                    ${escapeHTML(
                        String(
                            request.accountName ||
                            "U"
                        )
                            .charAt(0)
                            .toUpperCase()
                    )}

                </div>

                <div>

                    <strong>
                        ${escapeHTML(
                            request.accountName ||
                            "Unknown Account"
                        )}
                    </strong>

                    <span>
                        ${escapeHTML(
                            request.accountAddress ||
                            "No account address"
                        )}
                    </span>

                </div>

            </div>

            ${statusBadge(status)}

        </div>


        <div class="request-card-main">


            <div class="request-info">

                <span>
                    Credit Amount
                </span>

                <strong>
                    ${formatMoney(
                        request.creditAmount
                    )}
                </strong>

            </div>


            <div class="request-info">

                <span>
                    Credit Cost
                </span>

                <strong>
                    ${formatMoney(
                        request.creditCost
                    )}
                </strong>

            </div>


            <div class="request-info">

                <span>
                    Payment Method
                </span>

                <strong>
                    ${paymentMethodLabel(
                        request.paymentMethod
                    )}
                </strong>

            </div>


            <div class="request-info">

                <span>
                    Device
                </span>

                <strong class="device-value">

                    ${escapeHTML(
                        request.deviceId ||
                        "Unknown"
                    )}

                </strong>

            </div>


        </div>


        <div class="request-card-details">

            <div>

                <span>
                    Account Address
                </span>

                <strong>
                    ${escapeHTML(
                        request.accountAddress ||
                        "Not provided"
                    )}
                </strong>

            </div>


            <div>

                <span>
                    Requested
                </span>

                <strong>
                    ${formatDate(
                        request.createdAt
                    )}
                </strong>

            </div>

        </div>


        <div class="request-card-actions">

            <button
                class="request-view-btn"
                data-action="view"
                data-id="${escapeHTML(request.id)}"
            >
                View
            </button>


            ${
                isPending
                    ? `
                        <button
                            class="request-approve-btn"
                            data-action="approve"
                            data-id="${escapeHTML(request.id)}"
                        >
                            Approve
                        </button>

                        <button
                            class="request-reject-btn"
                            data-action="reject"
                            data-id="${escapeHTML(request.id)}"
                        >
                            Reject
                        </button>
                    `
                    : ""
            }


            <button
                class="request-delete-btn"
                data-action="delete"
                data-id="${escapeHTML(request.id)}"
            >
                Delete
            </button>

        </div>

    `;


    return card;
}


/* =========================================================
   RENDER REQUEST LIST
========================================================= */

function getFilteredRequests() {

    let requests =
        [...allRequests];


    if (currentFilter !== "all") {

        requests =
            requests.filter(
                function (request) {

                    return String(
                        request.status ||
                        "pending"
                    ).toLowerCase() ===
                        currentFilter;

                }
            );

    }


    if (currentSearch) {

        const search =
            currentSearch.toLowerCase();


        requests =
            requests.filter(
                function (request) {

                    return [

                        request.accountName,

                        request.accountAddress,

                        request.deviceId,

                        request.paymentMethod

                    ]
                        .filter(Boolean)
                        .some(
                            function (value) {

                                return String(value)
                                    .toLowerCase()
                                    .includes(search);

                            }
                        );

                }
            );

    }


    return requests;

}


function renderRequestList() {

    if (!requestList) return;


    const requests =
        getFilteredRequests();


    if (!requests.length) {

        requestList.innerHTML = `

            <div class="empty-state large">

                <div class="empty-icon">
                    ◎
                </div>

                <strong>
                    No credit requests
                </strong>

                <span>
                    Requests from Payza users will appear here instantly.
                </span>

            </div>

        `;

        return;

    }


    requestList.innerHTML = "";


    requests.forEach(
        function (request) {

            requestList.appendChild(
                createRequestCard(request)
            );

        }
    );

}


/* =========================================================
   RENDER RECENT REQUESTS
========================================================= */

function renderRecentRequests() {

    if (!recentRequests) return;


    const requests =
        [...allRequests]
            .sort(
                function (a, b) {

                    return getRequestTime(b)
                        - getRequestTime(a);

                }
            )
            .slice(0, 5);


    if (!requests.length) {

        recentRequests.innerHTML = `

            <div class="empty-state">

                <div class="empty-icon">
                    ◌
                </div>

                <strong>
                    No requests yet
                </strong>

                <span>
                    New credit requests will appear here automatically.
                </span>

            </div>

        `;

        return;

    }


    recentRequests.innerHTML = "";


    requests.forEach(
        function (request) {

            const card =
                createRequestCard(request);

            recentRequests.appendChild(card);

        }
    );

}


/* =========================================================
   RENDER APPROVED
========================================================= */

function renderApprovedRequests() {

    if (!approvedList) return;


    const requests =
        allRequests.filter(
            function (request) {

                return String(
                    request.status
                ).toLowerCase() ===
                    "approved";

            }
        );


    if (!requests.length) {

        approvedList.innerHTML = `

            <div class="empty-state large">

                <div class="empty-icon">
                    ✓
                </div>

                <strong>
                    No approved requests
                </strong>

                <span>
                    Approved requests will appear here.
                </span>

            </div>

        `;

        return;

    }


    approvedList.innerHTML = "";


    requests.forEach(
        function (request) {

            approvedList.appendChild(
                createRequestCard(request)
            );

        }
    );

}


/* =========================================================
   RENDER REJECTED
========================================================= */

function renderRejectedRequests() {

    if (!rejectedList) return;


    const requests =
        allRequests.filter(
            function (request) {

                return String(
                    request.status
                ).toLowerCase() ===
                    "rejected";

            }
        );


    if (!requests.length) {

        rejectedList.innerHTML = `

            <div class="empty-state large">

                <div class="empty-icon">
                    ×
                </div>

                <strong>
                    No rejected requests
                </strong>

                <span>
                    Rejected requests will appear here.
                </span>

            </div>

        `;

        return;

    }


    rejectedList.innerHTML = "";


    requests.forEach(
        function (request) {

            rejectedList.appendChild(
                createRequestCard(request)
            );

        }
    );

}


/* =========================================================
   UPDATE STATISTICS
========================================================= */

function updateStatistics() {

    const pending =
        allRequests.filter(
            request =>
                String(
                    request.status ||
                    "pending"
                ).toLowerCase() ===
                "pending"
        );


    const approved =
        allRequests.filter(
            request =>
                String(
                    request.status
                ).toLowerCase() ===
                "approved"
        );


    const rejected =
        allRequests.filter(
            request =>
                String(
                    request.status
                ).toLowerCase() ===
                "rejected"
        );


    const approvedAmount =
        approved.reduce(
            function (total, request) {

                return total +
                    (
                        Number(
                            request.creditAmount
                        ) || 0
                    );

            },
            0
        );


    if (sidebarPendingCount) {

        sidebarPendingCount.textContent =
            pending.length;

    }


    if (pendingStat) {

        pendingStat.textContent =
            pending.length;

    }


    if (approvedStat) {

        approvedStat.textContent =
            approved.length;

    }


    if (rejectedStat) {

        rejectedStat.textContent =
            rejected.length;

    }


    if (approvedAmountStat) {

        approvedAmountStat.textContent =
            formatMoney(
                approvedAmount
            );

    }

}


/* =========================================================
   REQUEST MODAL
========================================================= */

function openRequestModal(request) {

    if (!requestModal || !requestModalContent) {
        return;
    }


    requestModalContent.innerHTML = `

        <div class="request-detail-grid">

            <div>

                <span>
                    Account Name
                </span>

                <strong>
                    ${escapeHTML(
                        request.accountName ||
                        "Not provided"
                    )}
                </strong>

            </div>


            <div>

                <span>
                    Account Address
                </span>

                <strong>
                    ${escapeHTML(
                        request.accountAddress ||
                        "Not provided"
                    )}
                </strong>

            </div>


            <div>

                <span>
                    Credit Amount
                </span>

                <strong>
                    ${formatMoney(
                        request.creditAmount
                    )}
                </strong>

            </div>


            <div>

                <span>
                    Credit Cost
                </span>

                <strong>
                    ${formatMoney(
                        request.creditCost
                    )}
                </strong>

            </div>


            <div>

                <span>
                    Payment Method
                </span>

                <strong>
                    ${escapeHTML(
                        request.paymentMethod ||
                        "Bank Transfer"
                    )}
                </strong>

            </div>


            <div>

                <span>
                    Device ID
                </span>

                <strong>
                    ${escapeHTML(
                        request.deviceId ||
                        "Unknown"
                    )}
                </strong>

            </div>


            <div>

                <span>
                    Status
                </span>

                <strong>
                    ${String(
                        request.status ||
                        "pending"
                    ).toUpperCase()}
                </strong>

            </div>


            <div>

                <span>
                    Requested
                </span>

                <strong>
                    ${formatDate(
                        request.createdAt
                    )}
                </strong>

            </div>

        </div>

    `;


    requestModal.classList.remove("hidden");

}


/* =========================================================
   CLOSE REQUEST MODAL
========================================================= */

function closeRequestDetails() {

    if (!requestModal) return;

    requestModal.classList.add("hidden");

}


if (closeRequestModal) {

    closeRequestModal.addEventListener(
        "click",
        closeRequestDetails
    );

}


if (requestModal) {

    requestModal.addEventListener(
        "click",
        function (event) {

            if (
                event.target ===
                requestModal
            ) {

                closeRequestDetails();

            }

        }
    );

}


/* =========================================================
   CONFIRMATION
========================================================= */

function openConfirmation(
    title,
    message,
    action,
    type = "danger"
) {

    if (!confirmModal) return;


    confirmTitle.textContent =
        title;

    confirmMessage.textContent =
        message;


    confirmCallback =
        action;


    if (confirmIcon) {

        confirmIcon.textContent =
            type === "approve"
                ? "✓"
                : "!";

    }


    confirmActionBtn.className =
        type === "approve"
            ? "primary-btn"
            : "danger-btn";


    confirmActionBtn.textContent =
        type === "approve"
            ? "Approve"
            : "Confirm";


    confirmModal.classList.remove(
        "hidden"
    );

}


function closeConfirmation() {

    if (!confirmModal) return;

    confirmModal.classList.add(
        "hidden"
    );

    confirmCallback =
        null;

}


if (confirmCancelBtn) {

    confirmCancelBtn.addEventListener(
        "click",
        closeConfirmation
    );

}


if (confirmActionBtn) {

    confirmActionBtn.addEventListener(
        "click",
        async function () {

            if (!confirmCallback) {
                return;
            }


            const callback =
                confirmCallback;


            confirmCallback =
                null;


            try {

                await callback();

            } catch (error) {

                console.error(
                    "Confirmation action failed:",
                    error
                );

                showToast(
                "Error",
                error.message || "The operation could not be completed."
             );

            }


            closeConfirmation();

        }
    );

}

/* =========================================================
   ACCOUNT NUMBER REQUEST CARD
========================================================= */

function createAccountNumberRequestCard(request) {

    const status =
        String(
            request.status || "pending"
        ).toLowerCase();

    const isPending =
        status === "pending";

    const card =
        document.createElement("div");

    card.className =
        "request-card account-number-request-card";

    card.dataset.accountNumberRequestId =
        request.id || "";

    card.innerHTML = `

        <div class="request-card-top">

            <div class="request-user">

                <div class="request-avatar">
                    ${escapeHTML(
                        String(
                            request.accountName ||
                            request.userName ||
                            "U"
                        )
                            .charAt(0)
                            .toUpperCase()
                    )}
                </div>

                <div>

                    <strong>
                        ${escapeHTML(
                            request.accountName ||
                            request.userName ||
                            "Unknown Account"
                        )}
                    </strong>

                    <span>
                        ${escapeHTML(
                            request.accountAddress ||
                            request.deviceId ||
                            "Payza Account"
                        )}
                    </span>

                </div>

            </div>

            ${statusBadge(status)}

        </div>


        <div class="request-card-main">

            <div class="request-info">

                <span>
                    Request Type
                </span>

                <strong>
                    Account Number
                </strong>

            </div>


            <div class="request-info">

                <span>
                    Payment Method
                </span>

                <strong>
                    ${paymentMethodLabel(
                        request.paymentMethod
                    )}
                </strong>

            </div>


            <div class="request-info">

                <span>
                    Account Number Cost
                </span>

                <strong>
                    ${formatMoney(
                        request.accountNumberCost ??
                        request.cost ??
                        accountNumberCost
                    )}
                </strong>

            </div>


            <div class="request-info">

                <span>
                    Device ID
                </span>

                <strong class="device-value">
                    ${escapeHTML(
                        request.deviceId ||
                        "Unknown"
                    )}
                </strong>

            </div>

        </div>


        <div class="request-card-details">

            <div>

                <span>
                    Account Name
                </span>

                <strong>
                    ${escapeHTML(
                        request.accountName ||
                        request.userName ||
                        "Not provided"
                    )}
                </strong>

            </div>


            <div>

                <span>
                    Requested
                </span>

                <strong>
                    ${formatDate(
                        request.createdAt ||
                        request.requestedAt
                    )}
                </strong>

            </div>

        </div>


        <div class="request-card-actions">

            ${
                isPending
                    ? `

                        <button
                            class="request-approve-btn"
                            data-account-number-action="approve"
                            data-id="${escapeHTML(
                                request.id
                            )}"
                        >
                            Approve
                        </button>

                        <button
                            class="request-reject-btn"
                            data-account-number-action="reject"
                            data-id="${escapeHTML(
                                request.id
                            )}"
                        >
                            Reject
                        </button>

                    `
                    : ""
            }


            <button
                class="request-delete-btn"
                data-account-number-action="delete"
                data-id="${escapeHTML(
                    request.id
                )}"
            >
                Delete
            </button>

        </div>

    `;

    return card;
}


/* =========================================================
   RENDER ACCOUNT NUMBER REQUESTS
========================================================= */

function renderAccountNumberRequests() {

    /*
     * Use the existing request list so the requests
     * immediately appear in the Admin Dashboard.
     */
    if (!requestList) return;


    const requests =
        [...allAccountNumberRequests]
            .sort(
                function (a, b) {

                    return getRequestTime(b)
                        -
                        getRequestTime(a);

                }
            );


    /*
     * Remove old Account Number cards first.
     */
    requestList
        .querySelectorAll(
            ".account-number-request-card"
        )
        .forEach(
            function (card) {

                card.remove();

            }
        );


    /*
     * Add Account Number requests
     * before normal credit requests.
     */
    requests
        .slice()
        .reverse()
        .forEach(
            function (request) {

                requestList.prepend(
                    createAccountNumberRequestCard(
                        request
                    )
                );

            }
        );

}


/* =========================================================
   ACCOUNT NUMBER REQUEST BUTTON EVENTS
========================================================= */

document.addEventListener(
    "click",
    function (event) {

        const button =
            event.target.closest(
                "[data-account-number-action]"
            );

        if (!button) return;


        const action =
            button.dataset.accountNumberAction;

        const id =
            button.dataset.id;


        const request =
            allAccountNumberRequests.find(
                function (item) {

                    return item.id === id;

                }
            );


        if (!request) return;


        if (action === "approve") {

            openConfirmation(
                "Approve Account Number",
                `Approve the Account Number request from ${request.accountName || request.userName || "this user"}? A new Payza Account Number will be generated and assigned to this user's account.`,
                function () {

                    return approveAccountNumberRequest(
                        request.id
                    );

                },
                "approve"
            );

            return;

        }


        if (action === "reject") {

            openConfirmation(
                "Reject Account Number Request",
                `Reject the Account Number request from ${request.accountName || request.userName || "this user"}?`,
                async function () {

                    await updateDoc(
                        doc(
                            db,
                            "accountNumberRequests",
                            request.id
                        ),
                        {

                            status:
                                "rejected",

                            rejectedAt:
                                serverTimestamp(),

                            updatedAt:
                                serverTimestamp()

                        }
                    );


                    await addActivity(
                        "Account Number Rejected",
                        `${request.accountName || request.userName || "Account"} Account Number request was rejected.`
                    );


                    showToast(
                        "Request Rejected",
                        "The Account Number request has been rejected."
                    );

                }
            );

            return;

        }


        if (action === "delete") {

            openConfirmation(
                "Delete Account Number Request",
                "Delete this Account Number request permanently from the Admin Dashboard?",
                async function () {

                    await deleteDoc(
                        doc(
                            db,
                            "accountNumberRequests",
                            request.id
                        )
                    );


                    await addActivity(
                        "Account Number Request Deleted",
                        `${request.accountName || request.userName || "Account"} Account Number request was deleted.`
                    );


                    showToast(
                        "Request Deleted",
                        "The Account Number request has been removed."
                    );

                }
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

listenForActivity();


console.log(
    "Payza Admin Dashboard initialized."
);