"use client";

import React, { useState, useEffect } from "react";
import { SubscriptionPlan, RazorpayOrderResponse, RazorpayVerifyResponse } from "@/types/subscription";
import { apiRequest } from "@/lib/api";

interface RazorpayPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: SubscriptionPlan | null;
  onSuccess: (receipt: {
    payment_id: string;
    order_id: string;
    amount_inr: number;
    method: string;
    paid_at: string;
    plan_name: string;
  }) => void;
}

type PaymentMethodType = "upi" | "card" | "netbanking" | "wallet";
type UpiMode = "apps" | "qr" | "id";

export default function RazorpayPaymentModal({
  isOpen,
  onClose,
  plan,
  onSuccess,
}: RazorpayPaymentModalProps) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodType>("upi");
  const [upiMode, setUpiMode] = useState<UpiMode>("apps");
  const [selectedUpiApp, setSelectedUpiApp] = useState<string>("Google Pay");
  const [upiId, setUpiId] = useState<string>("success@razorpay");
  
  // Card details
  const [cardNumber, setCardNumber] = useState<string>("4111 1111 1111 1111");
  const [cardExpiry, setCardExpiry] = useState<string>("12/28");
  const [cardCvv, setCardCvv] = useState<string>("123");
  const [cardHolder, setCardHolder] = useState<string>("Demo User");

  // Netbanking details
  const [selectedBank, setSelectedBank] = useState<string>("HDFC Bank");

  // Wallet details
  const [selectedWallet, setSelectedWallet] = useState<string>("Paytm Wallet");

  // Transaction state
  const [orderData, setOrderData] = useState<RazorpayOrderResponse | null>(null);
  const [isCreatingOrder, setIsCreatingOrder] = useState<boolean>(false);
  const [paymentStep, setPaymentStep] = useState<"idle" | "processing" | "success" | "failed">("idle");
  const [processingStatus, setProcessingStatus] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [paymentReceipt, setPaymentReceipt] = useState<any>(null);
  const [showTaxBreakdown, setShowTaxBreakdown] = useState<boolean>(false);
  const [qrTimerSeconds, setQrTimerSeconds] = useState<number>(599); // 10 min

  // Initialize or fetch Razorpay order whenever modal opens with a plan
  useEffect(() => {
    if (isOpen && plan && plan.price_inr > 0) {
      setPaymentStep("idle");
      setErrorMessage(null);
      setPaymentReceipt(null);
      setIsCreatingOrder(true);

      const createOrder = async () => {
        try {
          const res = await apiRequest<RazorpayOrderResponse>("/subscriptions/razorpay/create-order", {
            method: "POST",
            requiresAuth: true,
            body: { plan_slug: plan.slug },
          });

          if (res.error) {
            setErrorMessage(res.error);
          } else if (res.data) {
            setOrderData(res.data);
            if (res.data.prefill?.name) {
              setCardHolder(res.data.prefill.name);
            }
          }
        } catch (err: any) {
          setErrorMessage(err.message || "Failed to initialize payment gateway order.");
        } finally {
          setIsCreatingOrder(false);
        }
      };

      createOrder();
    }
  }, [isOpen, plan]);

  // QR Timer countdown
  useEffect(() => {
    if (!isOpen || paymentStep !== "idle" || selectedMethod !== "upi" || upiMode !== "qr") return;
    const interval = setInterval(() => {
      setQrTimerSeconds((prev) => (prev > 0 ? prev - 1 : 599));
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, paymentStep, selectedMethod, upiMode]);

  if (!isOpen || !plan) return null;

  const basePrice = Math.round((plan.price_inr / 1.18) * 100) / 100;
  const gstAmount = Math.round((plan.price_inr - basePrice) * 100) / 100;

  // Format card number with spaces
  const handleCardNumberChange = (val: string) => {
    const raw = val.replace(/\D/g, "").slice(0, 16);
    const formatted = raw.match(/.{1,4}/g)?.join(" ") || raw;
    setCardNumber(formatted);
  };

  // Format expiry MM/YY
  const handleExpiryChange = (val: string) => {
    const raw = val.replace(/\D/g, "").slice(0, 4);
    if (raw.length >= 3) {
      setCardExpiry(`${raw.slice(0, 2)}/${raw.slice(2, 4)}`);
    } else {
      setCardExpiry(raw);
    }
  };

  const getCardBrand = (num: string) => {
    const clean = num.replace(/\s/g, "");
    if (clean.startsWith("4")) return "VISA";
    if (clean.startsWith("5")) return "Mastercard";
    if (clean.startsWith("6") || clean.startsWith("508")) return "RuPay";
    return "Card";
  };

  // Execute payment simulation and backend verification
  const handleProcessPayment = async () => {
    if (!orderData) return;

    // Check if test failure requested
    if (selectedMethod === "upi" && upiId.toLowerCase().includes("fail")) {
      setPaymentStep("processing");
      setProcessingStatus("Contacting Bank for UPI authorization...");
      setTimeout(() => {
        setPaymentStep("failed");
        setErrorMessage("Payment was declined by your UPI issuing bank (Simulated Test Decline).");
      }, 1800);
      return;
    }

    setPaymentStep("processing");
    setErrorMessage(null);

    try {
      // Step 1: Connecting
      setProcessingStatus("Connecting securely to Razorpay Gateway...");
      await new Promise((r) => setTimeout(r, 700));

      // Step 2: Authorizing
      const methodLabel =
        selectedMethod === "upi"
          ? `UPI (${upiMode === "apps" ? selectedUpiApp : upiId})`
          : selectedMethod === "card"
          ? `${getCardBrand(cardNumber)} ending in ${cardNumber.replace(/\s/g, "").slice(-4)}`
          : selectedMethod === "netbanking"
          ? `Netbanking (${selectedBank})`
          : `Wallet (${selectedWallet})`;

      setProcessingStatus(`Awaiting authorization from ${methodLabel}...`);
      await new Promise((r) => setTimeout(r, 900));

      // Step 3: Signature Verification with Backend
      setProcessingStatus("Verifying transaction authenticity on RoomiLink...");

      const mockPaymentId = `pay_${Math.random().toString(36).substring(2, 11).toUpperCase()}${Date.now().toString().slice(-4)}`;
      const mockSignature = `sig_demo_${Date.now()}`;

      const res = await apiRequest<RazorpayVerifyResponse>("/subscriptions/razorpay/verify-payment", {
        method: "POST",
        requiresAuth: true,
        body: {
          plan_slug: plan.slug,
          razorpay_order_id: orderData.order_id,
          razorpay_payment_id: mockPaymentId,
          razorpay_signature: mockSignature,
          payment_method: methodLabel,
        },
      });

      if (res.error) {
        setPaymentStep("failed");
        setErrorMessage(res.error || "Payment verification failed.");
      } else {
        const receipt = {
          payment_id: mockPaymentId,
          order_id: orderData.order_id,
          amount_inr: plan.price_inr,
          method: methodLabel,
          paid_at: new Date().toLocaleString("en-IN", {
            dateStyle: "medium",
            timeStyle: "short",
          }),
          plan_name: plan.name,
        };
        setPaymentReceipt(receipt);
        setPaymentStep("success");
        onSuccess(receipt);
      }
    } catch (err: any) {
      setPaymentStep("failed");
      setErrorMessage(err.message || "An unexpected error occurred during payment.");
    }
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Razorpay Branded Header */}
        <div className="bg-[#0c2340] text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center font-black text-white text-base shadow-md shadow-blue-500/30">
              R
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm tracking-wide">Razorpay</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  TEST MODE
                </span>
              </div>
              <p className="text-[11px] text-slate-300">RoomiLink AI Technologies Pvt Ltd</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-xs text-slate-400">Total Payable</div>
              <div className="text-lg font-black text-white">₹{plan.price_inr.toLocaleString("en-IN")}.00</div>
            </div>
            {paymentStep !== "processing" && (
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center text-sm transition-colors ml-2"
                title="Cancel & Close"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Order Details Bar */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-2.5 flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-800">{plan.name}</span>
            <span className="text-slate-400">&bull;</span>
            <span className="capitalize">{plan.billing_cycle} Recurring</span>
          </div>

          <button
            onClick={() => setShowTaxBreakdown(!showTaxBreakdown)}
            className="text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
          >
            {showTaxBreakdown ? "Hide Breakdown ▲" : "View Breakdown ▼"}
          </button>
        </div>

        {/* Collapsible Tax Breakdown */}
        {showTaxBreakdown && (
          <div className="bg-slate-100 px-6 py-3 border-b border-slate-200 text-xs text-slate-600 space-y-1 animate-fadeIn">
            <div className="flex justify-between">
              <span>Base Subscription Fee</span>
              <span>₹{basePrice.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Integrated GST (18%)</span>
              <span>₹{gstAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-slate-900 pt-1 border-t border-slate-200">
              <span>Total Amount (INR)</span>
              <span>₹{plan.price_inr.toFixed(2)}</span>
            </div>
          </div>
        )}

        {/* Modal Main Body */}
        <div className="flex-1 overflow-y-auto">
          {/* STATE 1: SUCCESSFUL PAYMENT RECEIPT */}
          {paymentStep === "success" && paymentReceipt && (
            <div className="p-6 sm:p-8 space-y-6 text-center animate-fadeIn">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-3xl mx-auto shadow-lg shadow-emerald-100">
                ✓
              </div>

              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Payment Successful!</h2>
                <p className="text-xs sm:text-sm text-slate-600 mt-1">
                  You are now an active <strong className="text-indigo-600 font-bold">{paymentReceipt.plan_name}</strong> member. All premium perks and AI features have been activated on your account.
                </p>
              </div>

              {/* Tax Invoice Card */}
              <div className="max-w-md mx-auto bg-slate-50 border border-slate-200 rounded-2xl p-5 text-left text-xs space-y-3 shadow-inner">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div>
                    <span className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-wider block">Official Receipt</span>
                    <span className="font-mono text-slate-700 font-semibold">{paymentReceipt.payment_id}</span>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-[10px]">
                    CAPTURED
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-slate-600">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Order Reference</span>
                    <span className="font-mono font-medium text-slate-800">{paymentReceipt.order_id}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Payment Method</span>
                    <span className="font-semibold text-slate-800">{paymentReceipt.method}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Date &amp; Time</span>
                    <span className="font-medium text-slate-800">{paymentReceipt.paid_at}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Total Paid</span>
                    <span className="font-black text-slate-900 text-sm">₹{paymentReceipt.amount_inr}.00</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-500 flex items-center justify-between">
                  <span>Merchant: RoomiLink AI Technologies</span>
                  <span>GSTIN: 27AABCR1234F1Z5</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                  onClick={handlePrintReceipt}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center gap-2 transition-all"
                >
                  <span>🖨️</span> Print / Save Receipt
                </button>
                <button
                  onClick={onClose}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-200 transition-all"
                >
                  Go to Dashboard &amp; Explore &rarr;
                </button>
              </div>
            </div>
          )}

          {/* STATE 2: PROCESSING PAYMENT */}
          {paymentStep === "processing" && (
            <div className="py-20 px-6 text-center space-y-5 animate-fadeIn">
              <div className="relative w-20 h-20 mx-auto">
                <div className="absolute inset-0 rounded-full border-4 border-indigo-100" />
                <div className="absolute inset-0 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center font-black text-indigo-700 text-lg">
                  ₹
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-bold text-slate-900">Processing Your Payment</h3>
                <p className="text-xs text-slate-500 font-medium max-w-xs mx-auto animate-pulse">
                  {processingStatus}
                </p>
              </div>

              <div className="text-[11px] text-slate-400">
                🔒 Do not close this window or hit refresh. Transaction secured by 256-bit encryption.
              </div>
            </div>
          )}

          {/* STATE 3: FAILED PAYMENT */}
          {paymentStep === "failed" && (
            <div className="py-16 px-6 text-center space-y-5 animate-fadeIn">
              <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center text-2xl mx-auto shadow-md">
                ✕
              </div>

              <div className="space-y-1.5">
                <h3 className="text-xl font-bold text-slate-900">Payment Failed</h3>
                <p className="text-xs text-rose-600 font-medium max-w-sm mx-auto">
                  {errorMessage || "The transaction could not be completed."}
                </p>
              </div>

              <div className="flex items-center justify-center gap-3 pt-3">
                <button
                  onClick={() => {
                    setPaymentStep("idle");
                    setUpiId("success@razorpay");
                  }}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-all shadow-md"
                >
                  Try Again
                </button>
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* STATE 4: NORMAL CHECKOUT SELECTOR */}
          {paymentStep === "idle" && (
            <div className="grid grid-cols-1 md:grid-cols-12 min-h-[380px]">
              {/* Payment Methods Sidebar */}
              <div className="md:col-span-4 bg-slate-50/70 border-r border-slate-200 p-4 space-y-1.5">
                <div className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider px-3 pb-1">
                  Payment Options
                </div>

                <button
                  onClick={() => setSelectedMethod("upi")}
                  className={`w-full text-left px-3.5 py-3 rounded-2xl text-xs font-bold transition-all flex items-center gap-3 ${
                    selectedMethod === "upi"
                      ? "bg-white text-indigo-700 shadow-md border border-indigo-100"
                      : "text-slate-600 hover:bg-white/60"
                  }`}
                >
                  <span className="text-base">⚡</span>
                  <div>
                    <div>UPI (Instant)</div>
                    <div className="text-[10px] text-slate-400 font-normal">GPay, PhonePe, QR</div>
                  </div>
                </button>

                <button
                  onClick={() => setSelectedMethod("card")}
                  className={`w-full text-left px-3.5 py-3 rounded-2xl text-xs font-bold transition-all flex items-center gap-3 ${
                    selectedMethod === "card"
                      ? "bg-white text-indigo-700 shadow-md border border-indigo-100"
                      : "text-slate-600 hover:bg-white/60"
                  }`}
                >
                  <span className="text-base">💳</span>
                  <div>
                    <div>Cards</div>
                    <div className="text-[10px] text-slate-400 font-normal">Credit, Debit, RuPay</div>
                  </div>
                </button>

                <button
                  onClick={() => setSelectedMethod("netbanking")}
                  className={`w-full text-left px-3.5 py-3 rounded-2xl text-xs font-bold transition-all flex items-center gap-3 ${
                    selectedMethod === "netbanking"
                      ? "bg-white text-indigo-700 shadow-md border border-indigo-100"
                      : "text-slate-600 hover:bg-white/60"
                  }`}
                >
                  <span className="text-base">🏦</span>
                  <div>
                    <div>Netbanking</div>
                    <div className="text-[10px] text-slate-400 font-normal">HDFC, SBI, ICICI, Axis</div>
                  </div>
                </button>

                <button
                  onClick={() => setSelectedMethod("wallet")}
                  className={`w-full text-left px-3.5 py-3 rounded-2xl text-xs font-bold transition-all flex items-center gap-3 ${
                    selectedMethod === "wallet"
                      ? "bg-white text-indigo-700 shadow-md border border-indigo-100"
                      : "text-slate-600 hover:bg-white/60"
                  }`}
                >
                  <span className="text-base">👛</span>
                  <div>
                    <div>Wallets</div>
                    <div className="text-[10px] text-slate-400 font-normal">Paytm, Amazon Pay</div>
                  </div>
                </button>
              </div>

              {/* Method Details Pane */}
              <div className="md:col-span-8 p-5 sm:p-6 space-y-5 flex flex-col justify-between">
                {/* 1. UPI TAB CONTENT */}
                {selectedMethod === "upi" && (
                  <div className="space-y-4">
                    {/* UPI Mode Selector */}
                    <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                      <button
                        onClick={() => setUpiMode("apps")}
                        className={`flex-1 py-1.5 rounded-lg transition-all ${
                          upiMode === "apps" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-600"
                        }`}
                      >
                        UPI Apps
                      </button>
                      <button
                        onClick={() => setUpiMode("qr")}
                        className={`flex-1 py-1.5 rounded-lg transition-all ${
                          upiMode === "qr" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-600"
                        }`}
                      >
                        QR Code
                      </button>
                      <button
                        onClick={() => setUpiMode("id")}
                        className={`flex-1 py-1.5 rounded-lg transition-all ${
                          upiMode === "id" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-600"
                        }`}
                      >
                        UPI ID / VPA
                      </button>
                    </div>

                    {/* Mode 1: Apps */}
                    {upiMode === "apps" && (
                      <div className="space-y-3">
                        <div className="text-xs text-slate-500">Choose your preferred UPI app for one-click payment:</div>
                        <div className="grid grid-cols-3 gap-2.5">
                          {[
                            { name: "Google Pay", color: "border-blue-200 bg-blue-50/50 text-blue-700", icon: "G" },
                            { name: "PhonePe", color: "border-purple-200 bg-purple-50/50 text-purple-700", icon: "Pe" },
                            { name: "Paytm", color: "border-sky-200 bg-sky-50/50 text-sky-800", icon: "₹" },
                          ].map((app) => (
                            <button
                              key={app.name}
                              onClick={() => setSelectedUpiApp(app.name)}
                              className={`p-3 rounded-2xl border text-center transition-all ${
                                selectedUpiApp === app.name
                                  ? `${app.color} ring-2 ring-indigo-500 font-bold shadow-sm`
                                  : "border-slate-200 hover:border-slate-300 text-slate-700"
                              }`}
                            >
                              <div className="w-8 h-8 rounded-full bg-white border border-slate-200 mx-auto flex items-center justify-center font-black text-xs mb-1.5 shadow-sm">
                                {app.icon}
                              </div>
                              <span className="text-[11px] block">{app.name}</span>
                            </button>
                          ))}
                        </div>

                        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] text-emerald-800 flex items-center gap-2">
                          <span>✓</span>
                          <span>Auto-configured with Razorpay demo sandbox instant approval.</span>
                        </div>
                      </div>
                    )}

                    {/* Mode 2: QR Code */}
                    {upiMode === "qr" && (
                      <div className="text-center space-y-3 py-1">
                        <div className="relative inline-block p-3 bg-white border-2 border-slate-300 rounded-2xl shadow-md">
                          {/* Simulated QR Code SVG */}
                          <svg className="w-36 h-36 mx-auto" viewBox="0 0 100 100" fill="none">
                            <rect width="100" height="100" fill="white" />
                            {/* Corner squares */}
                            <rect x="5" y="5" width="25" height="25" stroke="#0f172a" strokeWidth="4" fill="none" />
                            <rect x="11" y="11" width="13" height="13" fill="#0f172a" />
                            <rect x="70" y="5" width="25" height="25" stroke="#0f172a" strokeWidth="4" fill="none" />
                            <rect x="76" y="11" width="13" height="13" fill="#0f172a" />
                            <rect x="5" y="70" width="25" height="25" stroke="#0f172a" strokeWidth="4" fill="none" />
                            <rect x="11" y="76" width="13" height="13" fill="#0f172a" />
                            {/* QR Data Dots */}
                            <circle cx="45" cy="15" r="3" fill="#0f172a" />
                            <circle cx="55" cy="22" r="3" fill="#0f172a" />
                            <circle cx="40" cy="35" r="3" fill="#0f172a" />
                            <circle cx="50" cy="50" r="4" fill="#4f46e5" />
                            <circle cx="60" cy="40" r="3" fill="#0f172a" />
                            <circle cx="45" cy="75" r="3" fill="#0f172a" />
                            <circle cx="65" cy="70" r="3" fill="#0f172a" />
                            <circle cx="85" cy="55" r="3" fill="#0f172a" />
                            <circle cx="20" cy="48" r="3" fill="#0f172a" />
                          </svg>
                          <div className="text-[10px] font-bold text-indigo-700 mt-1">
                            ₹{plan.price_inr} • RoomiLink
                          </div>
                        </div>

                        <div className="text-xs text-slate-600">
                          Scan with any UPI app &bull; Valid for{" "}
                          <span className="font-mono font-bold text-slate-900">
                            {Math.floor(qrTimerSeconds / 60)}:{(qrTimerSeconds % 60).toString().padStart(2, "0")}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Mode 3: UPI ID */}
                    {upiMode === "id" && (
                      <div className="space-y-3">
                        <label className="text-xs font-bold text-slate-700 block">
                          Enter your UPI ID / Virtual Payment Address (VPA)
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={upiId}
                            onChange={(e) => setUpiId(e.target.value)}
                            placeholder="e.g. mobile@okhdfcbank"
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                          />
                        </div>

                        {/* Test Quick Fill Chips */}
                        <div className="space-y-1.5 pt-1">
                          <div className="text-[11px] text-slate-400 font-medium">Demo Simulator Shortcuts:</div>
                          <div className="flex flex-wrap gap-1.5">
                            <button
                              type="button"
                              onClick={() => setUpiId("success@razorpay")}
                              className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold hover:bg-emerald-100 transition-colors"
                            >
                              ⚡ success@razorpay (Instant Pass)
                            </button>
                            <button
                              type="button"
                              onClick={() => setUpiId("failure@razorpay")}
                              className="px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-bold hover:bg-rose-100 transition-colors"
                            >
                              ✕ failure@razorpay (Decline)
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 2. CARD TAB CONTENT */}
                {selectedMethod === "card" && (
                  <div className="space-y-3.5">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold text-slate-700">Card Number</label>
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                          {getCardBrand(cardNumber)}
                        </span>
                      </div>
                      <input
                        type="text"
                        value={cardNumber}
                        onChange={(e) => handleCardNumberChange(e.target.value)}
                        placeholder="4111 1111 1111 1111"
                        maxLength={19}
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">Expiry (MM/YY)</label>
                        <input
                          type="text"
                          value={cardExpiry}
                          onChange={(e) => handleExpiryChange(e.target.value)}
                          placeholder="MM/YY"
                          maxLength={5}
                          className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">CVV / CVC</label>
                        <input
                          type="password"
                          value={cardCvv}
                          onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                          placeholder="•••"
                          maxLength={4}
                          className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Name on Card</label>
                      <input
                        type="text"
                        value={cardHolder}
                        onChange={(e) => setCardHolder(e.target.value)}
                        placeholder="Full Name"
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>

                    {/* Pre-fill Helpers */}
                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setCardNumber("4111 1111 1111 1111");
                          setCardExpiry("12/28");
                          setCardCvv("123");
                        }}
                        className="text-[10px] px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold hover:bg-indigo-100"
                      >
                        ⚡ Fill Test Visa
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCardNumber("6080 1234 5678 9012");
                          setCardExpiry("06/29");
                          setCardCvv("456");
                        }}
                        className="text-[10px] px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold hover:bg-emerald-100"
                      >
                        ⚡ Fill Test RuPay
                      </button>
                    </div>
                  </div>
                )}

                {/* 3. NETBANKING TAB CONTENT */}
                {selectedMethod === "netbanking" && (
                  <div className="space-y-3">
                    <div className="text-xs text-slate-600 font-medium">Select your banking partner:</div>
                    <div className="grid grid-cols-2 gap-2.5">
                      {[
                        { name: "HDFC Bank", code: "HDFC" },
                        { name: "State Bank of India", code: "SBI" },
                        { name: "ICICI Bank", code: "ICICI" },
                        { name: "Axis Bank", code: "AXIS" },
                        { name: "Kotak Mahindra", code: "KOTAK" },
                        { name: "Punjab National", code: "PNB" },
                      ].map((bank) => (
                        <button
                          key={bank.name}
                          onClick={() => setSelectedBank(bank.name)}
                          className={`p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-all text-xs ${
                            selectedBank === bank.name
                              ? "border-indigo-600 bg-indigo-50/60 font-bold text-indigo-900 shadow-sm"
                              : "border-slate-200 hover:border-slate-300 text-slate-700"
                          }`}
                        >
                          <span className="w-6 h-6 rounded-md bg-slate-200 text-[10px] font-black flex items-center justify-center shrink-0">
                            {bank.code.slice(0, 2)}
                          </span>
                          <span className="truncate">{bank.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 4. WALLET TAB CONTENT */}
                {selectedMethod === "wallet" && (
                  <div className="space-y-3">
                    <div className="text-xs text-slate-600 font-medium">Select digital wallet:</div>
                    <div className="space-y-2">
                      {["Paytm Wallet", "Amazon Pay", "Mobikwik", "Freecharge"].map((w) => (
                        <button
                          key={w}
                          onClick={() => setSelectedWallet(w)}
                          className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all text-xs ${
                            selectedWallet === w
                              ? "border-indigo-600 bg-indigo-50/60 font-bold text-indigo-900 shadow-sm"
                              : "border-slate-200 hover:border-slate-300 text-slate-700"
                          }`}
                        >
                          <span>{w}</span>
                          <span className="text-slate-400 font-normal">Link &amp; Pay</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Pay Action Button */}
                <div className="pt-4 border-t border-slate-200">
                  <button
                    onClick={handleProcessPayment}
                    disabled={isCreatingOrder}
                    className="w-full py-3.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-extrabold text-xs shadow-lg shadow-indigo-200 hover:shadow-indigo-300 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <span>🔒</span>
                    <span>Pay ₹{plan.price_inr.toLocaleString("en-IN")}.00 Securely</span>
                  </button>

                  <div className="text-center mt-2.5 text-[10px] text-slate-400 flex items-center justify-center gap-2">
                    <span>PCI-DSS Level 1</span>
                    <span>&bull;</span>
                    <span>256-bit SSL</span>
                    <span>&bull;</span>
                    <span>RBI Compliant Tokenization</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
