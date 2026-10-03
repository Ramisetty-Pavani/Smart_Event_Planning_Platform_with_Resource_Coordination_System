import { useEffect, useMemo, useState } from "react";

function Budgets() {
  const [events, setEvents] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [expenses, setExpenses] = useState([]);

  const [selectedEvent, setSelectedEvent] = useState("");

  const [budget, setBudget] = useState("");
  const [expenseDescription, setExpenseDescription] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseCategory, setExpenseCategory] = useState("");

  const [editingBudgetId, setEditingBudgetId] = useState(null);
  const [editingExpenseId, setEditingExpenseId] = useState(null);

  const [summary, setSummary] = useState(null);

  const [loading, setLoading] = useState(false);
  const [savingBudget, setSavingBudget] = useState(false);
  const [savingExpense, setSavingExpense] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const EVENTS_URL =
    "http://localhost:8000/api/events/";

  const BUDGETS_URL =
    "http://localhost:8000/api/budgets/";

  const EXPENSES_URL =
    "http://localhost:8000/api/expenses/";

  // =====================================================
  // LOAD INITIAL DATA
  // =====================================================

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    setError("");

    try {
      const [
        eventsResponse,
        budgetsResponse,
        expensesResponse
      ] = await Promise.all([
        fetch(EVENTS_URL, {
          credentials: "include"
        }),
        fetch(BUDGETS_URL, {
          credentials: "include"
        }),
        fetch(EXPENSES_URL, {
          credentials: "include"
        })
      ]);

      const eventsText =
        await eventsResponse.text();

      const budgetsText =
        await budgetsResponse.text();

      const expensesText =
        await expensesResponse.text();

      let eventsData;
      let budgetsData;
      let expensesData;

      try {
        eventsData = JSON.parse(eventsText);
        budgetsData = JSON.parse(budgetsText);
        expensesData = JSON.parse(expensesText);
      } catch {
        throw new Error(
          "Invalid response received from Django"
        );
      }

      if (!eventsResponse.ok) {
        throw new Error(
          eventsData.message ||
            "Could not load events"
        );
      }

      if (!budgetsResponse.ok) {
        throw new Error(
          budgetsData.message ||
            "Could not load budgets"
        );
      }

      if (!expensesResponse.ok) {
        throw new Error(
          expensesData.message ||
            "Could not load expenses"
        );
      }

      setEvents(
        Array.isArray(eventsData)
          ? eventsData
          : eventsData.events || []
      );

      setBudgets(
        Array.isArray(budgetsData)
          ? budgetsData
          : budgetsData.budgets || []
      );

      setExpenses(
        Array.isArray(expensesData)
          ? expensesData
          : expensesData.expenses || []
      );
    } catch (err) {
      setError(
        err.message ||
          "Could not connect to Django"
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // LOAD EVENT SUMMARY
  // =====================================================

  const loadSummary = async (eventId) => {
    if (!eventId) {
      setSummary(null);
      return;
    }

    try {
      const response = await fetch(
        `${BUDGETS_URL}summary/${eventId}/`,
        {
          credentials: "include"
        }
      );

      const text =
        await response.text();

      let data;

      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(
          "Invalid summary response"
        );
      }

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Could not load budget summary"
        );
      }

      setSummary(data);
    } catch (err) {
      setSummary(null);
      setError(
        err.message ||
          "Could not load budget summary"
      );
    }
  };

  // =====================================================
  // EVENT CHANGE
  // =====================================================

  const handleEventChange = async (e) => {
    const eventId =
      e.target.value;

    setSelectedEvent(eventId);

    setMessage("");
    setError("");

    resetBudgetForm();
    resetExpenseForm();

    await loadSummary(eventId);
  };

  // =====================================================
  // EVENT NAME
  // =====================================================

  const getEventName = (eventId) => {
    const event = events.find(
      (item) =>
        Number(item.id) ===
        Number(eventId)
    );

    return event
      ? event.name
      : `Event ${eventId}`;
  };

  const selectedEventData = events.find(
    (event) =>
      Number(event.id) ===
      Number(selectedEvent)
  );

  // =====================================================
  // RESET FORMS
  // =====================================================

  const resetBudgetForm = () => {
    setBudget("");
    setEditingBudgetId(null);
  };

  const resetExpenseForm = () => {
    setExpenseDescription("");
    setExpenseAmount("");
    setExpenseCategory("");
    setEditingExpenseId(null);
  };

  // =====================================================
  // BUDGET SUBMIT
  // =====================================================

  const handleBudgetSubmit = async (e) => {
    e.preventDefault();

    setMessage("");
    setError("");

    if (!selectedEvent) {
      setError("Please select an event");
      return;
    }

    if (
      !budget ||
      Number(budget) <= 0
    ) {
      setError(
        "Budget must be greater than 0"
      );
      return;
    }

    const payload = {
      event_id: Number(selectedEvent),
      total_budget: Number(budget)
    };

    if (editingBudgetId !== null) {
      payload.id = editingBudgetId;
    }

    setSavingBudget(true);

    try {
      const response = await fetch(
        BUDGETS_URL,
        {
          method:
            editingBudgetId !== null
              ? "PUT"
              : "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          credentials: "include",

          body: JSON.stringify(payload)
        }
      );

      const text =
        await response.text();

      let data;

      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(
          `Invalid Django response. Status: ${response.status}`
        );
      }

      if (!response.ok) {
        throw new Error(
          data.message ||
            `Request failed with status ${response.status}`
        );
      }

      setMessage(
        editingBudgetId !== null
          ? "Budget updated successfully"
          : "Budget created successfully"
      );

      resetBudgetForm();

      await loadInitialData();

      await loadSummary(selectedEvent);
    } catch (err) {
      setError(
        err.message ||
          "Could not connect to Django"
      );
    } finally {
      setSavingBudget(false);
    }
  };

  // =====================================================
  // EXPENSE SUBMIT
  // =====================================================

  const handleExpenseSubmit = async (e) => {
    e.preventDefault();

    setMessage("");
    setError("");

    if (!selectedEvent) {
      setError("Please select an event");
      return;
    }

    if (
      !expenseDescription.trim()
    ) {
      setError(
        "Please enter expense description"
      );
      return;
    }

    if (
      !expenseAmount ||
      Number(expenseAmount) <= 0
    ) {
      setError(
        "Expense amount must be greater than 0"
      );
      return;
    }

    if (
      !expenseCategory.trim()
    ) {
      setError(
        "Please enter expense category"
      );
      return;
    }

    const payload = {
      event_id: Number(selectedEvent),
      description:
        expenseDescription.trim(),
      amount: Number(expenseAmount),
      category:
        expenseCategory.trim()
    };

    if (editingExpenseId !== null) {
      payload.id =
        editingExpenseId;
    }

    setSavingExpense(true);

    try {
      const response = await fetch(
        EXPENSES_URL,
        {
          method:
            editingExpenseId !== null
              ? "PUT"
              : "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          credentials: "include",

          body: JSON.stringify(payload)
        }
      );

      const text =
        await response.text();

      let data;

      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(
          `Invalid Django response. Status: ${response.status}`
        );
      }

      if (!response.ok) {
        throw new Error(
          data.message ||
            `Request failed with status ${response.status}`
        );
      }

      setMessage(
        editingExpenseId !== null
          ? "Expense updated successfully"
          : "Expense created successfully"
      );

      resetExpenseForm();

      await loadInitialData();

      await loadSummary(selectedEvent);
    } catch (err) {
      setError(
        err.message ||
          "Could not connect to Django"
      );
    } finally {
      setSavingExpense(false);
    }
  };

  // =====================================================
  // EDIT BUDGET
  // =====================================================

  const handleEditBudget = (item) => {
    setEditingBudgetId(item.id);

    setBudget(
      String(
        item.total_budget ??
          item.budget ??
          ""
      )
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  };

  // =====================================================
  // EDIT EXPENSE
  // =====================================================

  const handleEditExpense = (item) => {
    setEditingExpenseId(item.id);

    setExpenseDescription(
      item.description || ""
    );

    setExpenseAmount(
      String(item.amount ?? "")
    );

    setExpenseCategory(
      item.category || ""
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  };

  // =====================================================
  // DELETE BUDGET
  // =====================================================

  const handleDeleteBudget = async (
    id
  ) => {
    const confirmed =
      window.confirm(
        "Are you sure you want to delete this budget?"
      );

    if (!confirmed) {
      return;
    }

    setMessage("");
    setError("");

    try {
      const response = await fetch(
        BUDGETS_URL,
        {
          method: "DELETE",

          headers: {
            "Content-Type":
              "application/json"
          },

          credentials: "include",

          body: JSON.stringify({
            id: id
          })
        }
      );

      const text =
        await response.text();

      let data;

      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(
          `Invalid Django response. Status: ${response.status}`
        );
      }

      if (!response.ok) {
        throw new Error(
          data.message ||
            `Delete failed with status ${response.status}`
        );
      }

      setMessage(
        data.message ||
          "Budget deleted successfully"
      );

      await loadInitialData();

      await loadSummary(selectedEvent);
    } catch (err) {
      setError(
        err.message ||
          "Could not connect to Django"
      );
    }
  };

  // =====================================================
  // DELETE EXPENSE
  // =====================================================

  const handleDeleteExpense = async (
    id
  ) => {
    const confirmed =
      window.confirm(
        "Are you sure you want to delete this expense?"
      );

    if (!confirmed) {
      return;
    }

    setMessage("");
    setError("");

    try {
      const response = await fetch(
        EXPENSES_URL,
        {
          method: "DELETE",

          headers: {
            "Content-Type":
              "application/json"
          },

          credentials: "include",

          body: JSON.stringify({
            id: id
          })
        }
      );

      const text =
        await response.text();

      let data;

      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(
          `Invalid Django response. Status: ${response.status}`
        );
      }

      if (!response.ok) {
        throw new Error(
          data.message ||
            `Delete failed with status ${response.status}`
        );
      }

      setMessage(
        data.message ||
          "Expense deleted successfully"
      );

      await loadInitialData();

      await loadSummary(selectedEvent);
    } catch (err) {
      setError(
        err.message ||
          "Could not connect to Django"
      );
    }
  };

  // =====================================================
  // SUMMARY HELPER
  // =====================================================

  const getSummaryValue = (
    possibleNames,
    fallback = 0
  ) => {
    if (!summary) {
      return fallback;
    }

    for (
      const name of possibleNames
    ) {
      if (
        summary[name] !==
          undefined &&
        summary[name] !== null
      ) {
        return summary[name];
      }
    }

    return fallback;
  };

  // =====================================================
  // FINANCIAL VALUES
  // =====================================================

  const totalBudget = Number(
    getSummaryValue(
      [
        "total_budget",
        "budget"
      ],
      0
    )
  );

  const totalExpenses = Number(
    getSummaryValue(
      [
        "total_expenses",
        "expenses"
      ],
      0
    )
  );

  const remainingBudget = Number(
    getSummaryValue(
      [
        "remaining_budget",
        "remaining"
      ],
      totalBudget -
        totalExpenses
    )
  );

  const utilization = Number(
    getSummaryValue(
      [
        "budget_utilization",
        "utilization",
        "utilization_percentage"
      ],
      totalBudget > 0
        ? (totalExpenses /
            totalBudget) *
            100
        : 0
    )
  );

  const safeUtilization =
    Math.max(
      0,
      utilization || 0
    );

  // =====================================================
  // BUDGET STATUS
  // =====================================================

  const getBudgetStatus = () => {
    if (safeUtilization > 100) {
      return {
        text: "Budget Exceeded",
        background: "#fef2f2",
        color: "#dc2626",
        icon: "!"
      };
    }

    if (safeUtilization >= 90) {
      return {
        text: "Near Limit",
        background: "#fff7ed",
        color: "#ea580c",
        icon: "!"
      };
    }

    return {
      text: "Within Budget",
      background: "#f0fdf4",
      color: "#16a34a",
      icon: "✓"
    };
  };

  const budgetStatus =
    getBudgetStatus();

  // =====================================================
  // SELECTED BUDGET
  // =====================================================

  const selectedBudget =
    budgets.find(
      (item) =>
        Number(item.event_id) ===
        Number(selectedEvent)
    );

  // =====================================================
  // SELECTED EXPENSES
  // =====================================================

  const selectedExpenses =
    expenses.filter(
      (item) =>
        Number(item.event_id) ===
        Number(selectedEvent)
    );

  // =====================================================
  // EXPENSE TOTAL FROM RECORDS
  // =====================================================

  const selectedExpenseTotal =
    useMemo(() => {
      return selectedExpenses.reduce(
        (total, expense) =>
          total +
          Number(
            expense.amount || 0
          ),
        0
      );
    }, [selectedExpenses]);

  // =====================================================
  // CATEGORY SUMMARY
  // =====================================================

  const categorySummary =
    useMemo(() => {
      const categories = {};

      selectedExpenses.forEach(
        (expense) => {
          const category =
            expense.category ||
            "Other";

          categories[category] =
            (categories[category] ||
              0) +
            Number(
              expense.amount || 0
            );
        }
      );

      return Object.entries(
        categories
      ).sort(
        (a, b) => b[1] - a[1]
      );
    }, [selectedExpenses]);

  // =====================================================
  // FORMAT CURRENCY
  // =====================================================

  const formatCurrency = (
    value
  ) => {
    return new Intl.NumberFormat(
      "en-IN",
      {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0
      }
    ).format(
      Number(value || 0)
    );
  };

  return (
    <div style={styles.page}>

      {/* ================================================
          HEADER
      ================================================ */}

      <div style={styles.header}>

        <div>
          <div style={styles.eyebrow}>
            FINANCIAL MANAGEMENT
          </div>

          <h1 style={styles.title}>
            Budgets & Expenses
          </h1>

          <p style={styles.subtitle}>
            Manage event budgets, track
            expenses and monitor financial
            health in real time.
          </p>
        </div>

        <div style={styles.headerIcon}>
          ₹
        </div>

      </div>

      {/* ================================================
          ALERTS
      ================================================ */}

      {message && (
        <div style={styles.successAlert}>
          <div style={styles.alertIcon}>
            ✓
          </div>

          <div>
            <strong>Success</strong>
            <div>{message}</div>
          </div>
        </div>
      )}

      {error && (
        <div style={styles.errorAlert}>
          <div style={styles.alertIcon}>
            !
          </div>

          <div>
            <strong>Something went wrong</strong>
            <div>{error}</div>
          </div>
        </div>
      )}

      {/* ================================================
          EVENT SELECTOR
      ================================================ */}

      <div style={styles.sectionCard}>

        <div style={styles.sectionHeader}>
          <div>
            <h2 style={styles.sectionTitle}>
              Event Selection
            </h2>

            <p style={styles.sectionSubtitle}>
              Select an event to view and
              manage its financial details.
            </p>
          </div>
        </div>

        <select
          value={selectedEvent}
          onChange={handleEventChange}
          style={styles.select}
        >
          <option value="">
            Select an event
          </option>

          {events.map((event) => (
            <option
              key={event.id}
              value={event.id}
            >
              {event.name}
            </option>
          ))}
        </select>

      </div>

      {/* ================================================
          LOADING
      ================================================ */}

      {loading && (
        <div style={styles.loadingCard}>
          <div style={styles.spinner} />
          <span>
            Loading financial data...
          </span>
        </div>
      )}

      {/* ================================================
          SELECTED EVENT
      ================================================ */}

      {selectedEvent && (
        <>

          {/* ============================================
              EVENT INFO
          ============================================ */}

          {selectedEventData && (
            <div style={styles.eventBanner}>

              <div>
                <div style={styles.eventLabel}>
                  SELECTED EVENT
                </div>

                <h2 style={styles.eventName}>
                  {selectedEventData.name}
                </h2>

                <div style={styles.eventDetails}>
                  <span>
                    📅{" "}
                    {selectedEventData.date ||
                      "Date not available"}
                  </span>

                  <span>
                    📍{" "}
                    {selectedEventData.location ||
                      "Location not available"}
                  </span>

                  {selectedEventData.capacity && (
                    <span>
                      👥 Capacity:{" "}
                      {selectedEventData.capacity}
                    </span>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* ============================================
              FINANCIAL SUMMARY
          ============================================ */}

          <div style={styles.summaryGrid}>

            <SummaryCard
              title="Total Budget"
              value={formatCurrency(
                totalBudget
              )}
              icon="₹"
              description="Allocated budget"
            />

            <SummaryCard
              title="Total Expenses"
              value={formatCurrency(
                totalExpenses
              )}
              icon="↗"
              description="Amount spent"
            />

            <SummaryCard
              title="Remaining"
              value={formatCurrency(
                remainingBudget
              )}
              icon="✓"
              description={
                remainingBudget >= 0
                  ? "Available balance"
                  : "Amount over budget"
              }
              danger={
                remainingBudget < 0
              }
            />

            <SummaryCard
              title="Utilization"
              value={`${safeUtilization.toFixed(
                1
              )}%`}
              icon="%"
              description="Budget consumed"
              warning={
                safeUtilization >= 90
              }
            />

          </div>

          {/* ============================================
              BUDGET STATUS
          ============================================ */}

          <div
            style={{
              ...styles.statusBanner,
              background:
                budgetStatus.background,
              borderColor:
                budgetStatus.color
            }}
          >

            <div
              style={{
                ...styles.statusCircle,
                background:
                  budgetStatus.color
              }}
            >
              {budgetStatus.icon}
            </div>

            <div style={{ flex: 1 }}>

              <strong
                style={{
                  color:
                    budgetStatus.color,
                  fontSize: "16px"
                }}
              >
                {budgetStatus.text}
              </strong>

              <p style={styles.statusText}>
                {safeUtilization > 100
                  ? "Expenses have exceeded the allocated budget. Review your expenses."
                  : safeUtilization >= 90
                  ? "Expenses are approaching the budget limit. Monitor remaining spending carefully."
                  : "Current expenses are within the allocated budget."}
              </p>

            </div>

          </div>

          {/* ============================================
              PROGRESS BAR
          ============================================ */}

          <div style={styles.sectionCard}>

            <div style={styles.progressHeader}>
              <div>
                <h2 style={styles.sectionTitle}>
                  Budget Utilization
                </h2>

                <p style={styles.sectionSubtitle}>
                  {formatCurrency(
                    totalExpenses
                  )}{" "}
                  spent of{" "}
                  {formatCurrency(
                    totalBudget
                  )}
                </p>
              </div>

              <strong
                style={{
                  fontSize: "20px"
                }}
              >
                {safeUtilization.toFixed(
                  1
                )}
                %
              </strong>
            </div>

            <div style={styles.progressTrack}>

              <div
                style={{
                  ...styles.progressBar,
                  width: `${Math.min(
                    safeUtilization,
                    100
                  )}%`,
                  background:
                    safeUtilization >
                    100
                      ? "#dc2626"
                      : safeUtilization >=
                        90
                      ? "#f59e0b"
                      : "#2563eb"
                }}
              />

            </div>

          </div>

          {/* ============================================
              FORMS GRID
          ============================================ */}

          <div style={styles.formsGrid}>

            {/* ==========================================
                BUDGET FORM
            ========================================== */}

            <div style={styles.sectionCard}>

              <div style={styles.sectionHeader}>
                <div>

                  <h2 style={styles.sectionTitle}>
                    {editingBudgetId !==
                    null
                      ? "Edit Budget"
                      : "Set Event Budget"}
                  </h2>

                  <p style={styles.sectionSubtitle}>
                    Define the total amount
                    available for this event.
                  </p>

                </div>

                <div style={styles.formIcon}>
                  ₹
                </div>
              </div>

              <form
                onSubmit={
                  handleBudgetSubmit
                }
              >

                <label style={styles.label}>
                  Total Budget
                </label>

                <div
                  style={
                    styles.currencyInput
                  }
                >
                  <span>₹</span>

                  <input
                    type="number"
                    min="1"
                    value={budget}
                    onChange={(e) =>
                      setBudget(
                        e.target.value
                      )
                    }
                    placeholder="Enter total budget"
                    style={
                      styles.currencyField
                    }
                  />
                </div>

                <div style={styles.formActions}>

                  <button
                    type="submit"
                    disabled={
                      savingBudget
                    }
                    style={{
                      ...styles.primaryButton,
                      opacity:
                        savingBudget
                          ? 0.7
                          : 1
                    }}
                  >
                    {savingBudget
                      ? "Saving..."
                      : editingBudgetId !==
                        null
                      ? "Update Budget"
                      : "Create Budget"}
                  </button>

                  {editingBudgetId !==
                    null && (
                    <button
                      type="button"
                      onClick={
                        resetBudgetForm
                      }
                      style={
                        styles.secondaryButton
                      }
                    >
                      Cancel
                    </button>
                  )}

                </div>

              </form>

            </div>

            {/* ==========================================
                EXPENSE FORM
            ========================================== */}

            <div style={styles.sectionCard}>

              <div style={styles.sectionHeader}>

                <div>

                  <h2 style={styles.sectionTitle}>
                    {editingExpenseId !==
                    null
                      ? "Edit Expense"
                      : "Add Expense"}
                  </h2>

                  <p style={styles.sectionSubtitle}>
                    Record spending against
                    this event.
                  </p>

                </div>

                <div style={styles.formIcon}>
                  +
                </div>

              </div>

              <form
                onSubmit={
                  handleExpenseSubmit
                }
              >

                <div style={styles.formGroup}>

                  <label style={styles.label}>
                    Description
                  </label>

                  <input
                    type="text"
                    value={
                      expenseDescription
                    }
                    onChange={(e) =>
                      setExpenseDescription(
                        e.target.value
                      )
                    }
                    placeholder="e.g. Catering service"
                    style={styles.input}
                  />

                </div>

                <div style={styles.formRow}>

                  <div style={styles.formGroup}>
                    <label
                      style={
                        styles.label
                      }
                    >
                      Amount
                    </label>

                    <div
                      style={
                        styles.currencyInput
                      }
                    >
                      <span>₹</span>

                      <input
                        type="number"
                        min="1"
                        value={
                          expenseAmount
                        }
                        onChange={(e) =>
                          setExpenseAmount(
                            e.target.value
                          )
                        }
                        placeholder="Amount"
                        style={
                          styles.currencyField
                        }
                      />
                    </div>
                  </div>

                  <div style={styles.formGroup}>
                    <label
                      style={
                        styles.label
                      }
                    >
                      Category
                    </label>

                    <input
                      type="text"
                      value={
                        expenseCategory
                      }
                      onChange={(e) =>
                        setExpenseCategory(
                          e.target.value
                        )
                      }
                      placeholder="Catering"
                      style={
                        styles.input
                      }
                    />
                  </div>

                </div>

                <div style={styles.formActions}>

                  <button
                    type="submit"
                    disabled={
                      savingExpense
                    }
                    style={{
                      ...styles.primaryButton,
                      opacity:
                        savingExpense
                          ? 0.7
                          : 1
                    }}
                  >
                    {savingExpense
                      ? "Saving..."
                      : editingExpenseId !==
                        null
                      ? "Update Expense"
                      : "Add Expense"}
                  </button>

                  {editingExpenseId !==
                    null && (
                    <button
                      type="button"
                      onClick={
                        resetExpenseForm
                      }
                      style={
                        styles.secondaryButton
                      }
                    >
                      Cancel
                    </button>
                  )}

                </div>

              </form>

            </div>

          </div>

          {/* ============================================
              BUDGET DETAILS + CATEGORY BREAKDOWN
          ============================================ */}

          <div style={styles.twoColumnGrid}>

            {/* BUDGET DETAILS */}

            <div style={styles.sectionCard}>

              <div style={styles.sectionHeader}>

                <div>
                  <h2 style={styles.sectionTitle}>
                    Event Budget
                  </h2>

                  <p style={styles.sectionSubtitle}>
                    Current budget allocation
                  </p>
                </div>

              </div>

              {selectedBudget ? (
                <div>

                  <div
                    style={
                      styles.budgetAmountBox
                    }
                  >
                    <span>
                      Allocated Budget
                    </span>

                    <strong>
                      {formatCurrency(
                        selectedBudget.total_budget ??
                          selectedBudget.budget
                      )}
                    </strong>
                  </div>

                  <div
                    style={
                      styles.actionRow
                    }
                  >

                    <button
                      onClick={() =>
                        handleEditBudget(
                          selectedBudget
                        )
                      }
                      style={
                        styles.secondaryAction
                      }
                    >
                      ✏ Edit
                    </button>

                    <button
                      onClick={() =>
                        handleDeleteBudget(
                          selectedBudget.id
                        )
                      }
                      style={
                        styles.deleteAction
                      }
                    >
                      🗑 Delete
                    </button>

                  </div>

                </div>
              ) : (
                <div style={styles.emptyState}>
                  <div style={styles.emptyIcon}>
                    ₹
                  </div>

                  <strong>
                    No budget created
                  </strong>

                  <p>
                    Set a budget above to
                    start tracking this
                    event's finances.
                  </p>
                </div>
              )}

            </div>

            {/* CATEGORY BREAKDOWN */}

            <div style={styles.sectionCard}>

              <div style={styles.sectionHeader}>

                <div>
                  <h2 style={styles.sectionTitle}>
                    Expense Categories
                  </h2>

                  <p style={styles.sectionSubtitle}>
                    Spending breakdown by
                    category
                  </p>
                </div>

              </div>

              {categorySummary.length >
              0 ? (
                <div
                  style={
                    styles.categoryList
                  }
                >

                  {categorySummary.map(
                    ([category, amount]) => {

                      const percentage =
                        totalExpenses >
                        0
                          ? (amount /
                              totalExpenses) *
                            100
                          : 0;

                      return (
                        <div
                          key={
                            category
                          }
                          style={
                            styles.categoryItem
                          }
                        >

                          <div
                            style={
                              styles.categoryTop
                            }
                          >

                            <strong>
                              {category}
                            </strong>

                            <span>
                              {formatCurrency(
                                amount
                              )}
                            </span>

                          </div>

                          <div
                            style={
                              styles.miniTrack
                            }
                          >

                            <div
                              style={{
                                ...styles.miniBar,
                                width: `${percentage}%`
                              }}
                            />

                          </div>

                          <small
                            style={
                              styles.categoryPercent
                            }
                          >
                            {percentage.toFixed(
                              1
                            )}
                            %
                          </small>

                        </div>
                      );
                    }
                  )}

                </div>
              ) : (
                <div style={styles.emptyState}>
                  <div style={styles.emptyIcon}>
                    %
                  </div>

                  <strong>
                    No expense data
                  </strong>

                  <p>
                    Add expenses to see
                    category-wise spending.
                  </p>
                </div>
              )}

            </div>

          </div>

          {/* ============================================
              EXPENSES
          ============================================ */}

          <div style={styles.sectionCard}>

            <div style={styles.expenseHeader}>

              <div>

                <h2 style={styles.sectionTitle}>
                  Expenses
                </h2>

                <p style={styles.sectionSubtitle}>
                  All recorded expenses for{" "}
                  <strong>
                    {getEventName(
                      selectedEvent
                    )}
                  </strong>
                </p>

              </div>

              <div
                style={
                  styles.expenseCount
                }
              >
                {selectedExpenses.length}{" "}
                {selectedExpenses.length ===
                1
                  ? "expense"
                  : "expenses"}
              </div>

            </div>

            {selectedExpenses.length ===
            0 ? (
              <div style={styles.emptyState}>
                <div style={styles.emptyIcon}>
                  ₹
                </div>

                <strong>
                  No expenses found
                </strong>

                <p>
                  Expenses added for this
                  event will appear here.
                </p>
              </div>
            ) : (
              <div
                style={
                  styles.expenseList
                }
              >

                {selectedExpenses.map(
                  (expense) => (

                    <div
                      key={
                        expense.id
                      }
                      style={
                        styles.expenseCard
                      }
                    >

                      <div
                        style={
                          styles.expenseMain
                        }
                      >

                        <div
                          style={
                            styles.expenseIcon
                          }
                        >
                          ₹
                        </div>

                        <div>

                          <h3
                            style={
                              styles.expenseTitle
                            }
                          >
                            {
                              expense.description
                            }
                          </h3>

                          <div
                            style={
                              styles.expenseMeta
                            }
                          >
                            <span>
                              {
                                expense.category
                              }
                            </span>

                            <span>
                              Expense #{expense.id}
                            </span>
                          </div>

                        </div>

                      </div>

                      <div
                        style={
                          styles.expenseRight
                        }
                      >

                        <strong
                          style={
                            styles.expenseAmount
                          }
                        >
                          {formatCurrency(
                            expense.amount
                          )}
                        </strong>

                        <div
                          style={
                            styles.actionRow
                          }
                        >

                          <button
                            onClick={() =>
                              handleEditExpense(
                                expense
                              )
                            }
                            style={
                              styles.secondaryAction
                            }
                          >
                            ✏ Edit
                          </button>

                          <button
                            onClick={() =>
                              handleDeleteExpense(
                                expense.id
                              )
                            }
                            style={
                              styles.deleteAction
                            }
                          >
                            🗑 Delete
                          </button>

                        </div>

                      </div>

                    </div>

                  )
                )}

              </div>
            )}

            {selectedExpenses.length >
              0 && (
              <div
                style={
                  styles.expenseTotal
                }
              >

                <span>
                  Expense records total
                </span>

                <strong>
                  {formatCurrency(
                    selectedExpenseTotal
                  )}
                </strong>

              </div>
            )}

          </div>

        </>
      )}

      {/* ================================================
          NO EVENT SELECTED
      ================================================ */}

      {!selectedEvent &&
        !loading && (
          <div style={styles.welcomeCard}>

            <div
              style={
                styles.welcomeIcon
              }
            >
              ₹
            </div>

            <h2>
              Select an event to begin
            </h2>

            <p>
              Choose an event above to
              manage its budget, record
              expenses and monitor financial
              performance.
            </p>

          </div>
        )}

    </div>
  );
}

// =======================================================
// SUMMARY CARD
// =======================================================

function SummaryCard({
  title,
  value,
  icon,
  description,
  danger,
  warning
}) {
  return (
    <div
      style={{
        ...styles.summaryCard,
        borderTop: danger
          ? "3px solid #dc2626"
          : warning
          ? "3px solid #f59e0b"
          : "3px solid #2563eb"
      }}
    >

      <div
        style={
          styles.summaryCardTop
        }
      >

        <div>
          <p
            style={
              styles.summaryTitle
            }
          >
            {title}
          </p>

          <h2
            style={{
              ...styles.summaryValue,
              color: danger
                ? "#dc2626"
                : "#111827"
            }}
          >
            {value}
          </h2>
        </div>

        <div
          style={
            styles.summaryIcon
          }
        >
          {icon}
        </div>

      </div>

      <p
        style={
          styles.summaryDescription
        }
      >
        {description}
      </p>

    </div>
  );
}

// =======================================================
// STYLES
// =======================================================

const styles = {
  page: {
    marginLeft: "250px",
    padding: "32px",
    maxWidth: "1450px",
    marginRight: "auto",
    minHeight: "100vh",
    background: "#f8fafc",
    boxSizing: "border-box"
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "28px"
  },

  eyebrow: {
    fontSize: "12px",
    fontWeight: "700",
    color: "#2563eb",
    letterSpacing: "1.5px",
    marginBottom: "6px"
  },

  title: {
    margin: 0,
    fontSize: "32px",
    fontWeight: "750",
    color: "#111827"
  },

  subtitle: {
    marginTop: "8px",
    color: "#64748b",
    fontSize: "15px"
  },

  headerIcon: {
    width: "60px",
    height: "60px",
    borderRadius: "16px",
    background: "#eff6ff",
    color: "#2563eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "28px",
    fontWeight: "800"
  },

  successAlert: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    background: "#f0fdf4",
    border: "1px solid #bbf7d0",
    color: "#166534",
    padding: "14px 16px",
    borderRadius: "12px",
    marginBottom: "18px"
  },

  errorAlert: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    background: "#fef2f2",
    border: "1px solid #fecaca",
    color: "#b91c1c",
    padding: "14px 16px",
    borderRadius: "12px",
    marginBottom: "18px"
  },

  alertIcon: {
    width: "30px",
    height: "30px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "800",
    background: "white"
  },

  sectionCard: {
    background: "white",
    border: "1px solid #e2e8f0",
    borderRadius: "16px",
    padding: "24px",
    marginBottom: "22px",
    boxShadow:
      "0 2px 8px rgba(15, 23, 42, 0.04)"
  },

  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "18px"
  },

  sectionTitle: {
    margin: 0,
    fontSize: "20px",
    color: "#111827"
  },

  sectionSubtitle: {
    margin: "5px 0 0",
    color: "#64748b",
    fontSize: "13px"
  },

  select: {
    width: "100%",
    padding: "13px 14px",
    border: "1px solid #cbd5e1",
    borderRadius: "10px",
    background: "white",
    color: "#111827",
    fontSize: "14px",
    outline: "none",
    boxSizing: "border-box"
  },

  eventBanner: {
    background:
      "linear-gradient(135deg, #1e3a8a, #2563eb)",
    color: "white",
    padding: "24px",
    borderRadius: "16px",
    marginBottom: "22px"
  },

  eventLabel: {
    fontSize: "11px",
    fontWeight: "700",
    letterSpacing: "1.3px",
    opacity: 0.8
  },

  eventName: {
    margin: "5px 0 12px",
    fontSize: "25px"
  },

  eventDetails: {
    display: "flex",
    flexWrap: "wrap",
    gap: "18px",
    fontSize: "13px",
    opacity: 0.9
  },

  summaryGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "16px",
    marginBottom: "22px"
  },

  summaryCard: {
    background: "white",
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    padding: "20px",
    boxShadow:
      "0 2px 8px rgba(15, 23, 42, 0.04)"
  },

  summaryCardTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start"
  },

  summaryTitle: {
    margin: 0,
    color: "#64748b",
    fontSize: "13px",
    fontWeight: "600"
  },

  summaryValue: {
    margin: "8px 0 0",
    fontSize: "25px",
    fontWeight: "750"
  },

  summaryIcon: {
    width: "40px",
    height: "40px",
    borderRadius: "10px",
    background: "#eff6ff",
    color: "#2563eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "800",
    fontSize: "17px"
  },

  summaryDescription: {
    margin: "12px 0 0",
    color: "#94a3b8",
    fontSize: "12px"
  },

  statusBanner: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    border: "1px solid",
    borderRadius: "14px",
    padding: "16px",
    marginBottom: "22px"
  },

  statusCircle: {
    width: "38px",
    height: "38px",
    borderRadius: "50%",
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "800"
  },

  statusText: {
    margin: "5px 0 0",
    color: "#64748b",
    fontSize: "13px"
  },

  progressHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "16px"
  },

  progressTrack: {
    height: "12px",
    background: "#e2e8f0",
    borderRadius: "999px",
    overflow: "hidden"
  },

  progressBar: {
    height: "100%",
    borderRadius: "999px",
    transition:
      "width 0.4s ease"
  },

  formsGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(360px, 1fr))",
    gap: "22px"
  },

  formIcon: {
    width: "42px",
    height: "42px",
    borderRadius: "10px",
    background: "#eff6ff",
    color: "#2563eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "18px",
    fontWeight: "800"
  },

  formGroup: {
    marginBottom: "15px"
  },

  formRow: {
    display: "grid",
    gridTemplateColumns:
      "1fr 1fr",
    gap: "14px"
  },

  label: {
    display: "block",
    marginBottom: "7px",
    color: "#374151",
    fontSize: "13px",
    fontWeight: "600"
  },

  input: {
    width: "100%",
    padding: "12px 13px",
    border: "1px solid #cbd5e1",
    borderRadius: "9px",
    fontSize: "14px",
    boxSizing: "border-box",
    outline: "none"
  },

  currencyInput: {
    display: "flex",
    alignItems: "center",
    border: "1px solid #cbd5e1",
    borderRadius: "9px",
    overflow: "hidden",
    background: "white"
  },

  currencyField: {
    flex: 1,
    border: "none",
    outline: "none",
    padding: "12px 10px",
    fontSize: "14px",
    minWidth: 0
  },

  formActions: {
    display: "flex",
    gap: "10px",
    marginTop: "18px"
  },

  primaryButton: {
    border: "none",
    borderRadius: "9px",
    padding: "11px 18px",
    background: "#2563eb",
    color: "white",
    fontWeight: "650",
    cursor: "pointer"
  },

  secondaryButton: {
    border: "1px solid #cbd5e1",
    borderRadius: "9px",
    padding: "10px 18px",
    background: "white",
    color: "#475569",
    fontWeight: "600",
    cursor: "pointer"
  },

  twoColumnGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(360px, 1fr))",
    gap: "22px"
  },

  budgetAmountBox: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    padding: "20px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center"
  },

  actionRow: {
    display: "flex",
    gap: "8px",
    marginTop: "12px"
  },

  secondaryAction: {
    border: "1px solid #cbd5e1",
    background: "white",
    color: "#334155",
    borderRadius: "8px",
    padding: "8px 12px",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: "600"
  },

  deleteAction: {
    border: "none",
    background: "#fef2f2",
    color: "#dc2626",
    borderRadius: "8px",
    padding: "8px 12px",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: "600"
  },

  categoryList: {
    display: "grid",
    gap: "17px"
  },

  categoryItem: {
    paddingBottom: "14px",
    borderBottom:
      "1px solid #f1f5f9"
  },

  categoryTop: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "13px",
    marginBottom: "8px"
  },

  miniTrack: {
    height: "7px",
    background: "#e2e8f0",
    borderRadius: "999px",
    overflow: "hidden"
  },

  miniBar: {
    height: "100%",
    background: "#2563eb",
    borderRadius: "999px"
  },

  categoryPercent: {
    display: "block",
    color: "#94a3b8",
    marginTop: "5px"
  },

  expenseHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px"
  },

  expenseCount: {
    background: "#eff6ff",
    color: "#2563eb",
    borderRadius: "999px",
    padding: "7px 12px",
    fontSize: "12px",
    fontWeight: "700"
  },

  expenseList: {
    display: "grid",
    gap: "12px"
  },

  expenseCard: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "20px",
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    padding: "17px",
    background: "#fff"
  },

  expenseMain: {
    display: "flex",
    alignItems: "center",
    gap: "13px",
    minWidth: 0
  },

  expenseIcon: {
    width: "42px",
    height: "42px",
    borderRadius: "10px",
    background: "#f0fdf4",
    color: "#16a34a",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "800"
  },

  expenseTitle: {
    margin: 0,
    fontSize: "15px",
    color: "#111827"
  },

  expenseMeta: {
    display: "flex",
    gap: "10px",
    marginTop: "6px",
    color: "#64748b",
    fontSize: "12px"
  },

  expenseRight: {
    textAlign: "right"
  },

  expenseAmount: {
    display: "block",
    color: "#111827",
    fontSize: "16px"
  },

  expenseTotal: {
    marginTop: "18px",
    paddingTop: "18px",
    borderTop:
      "1px solid #e2e8f0",
    display: "flex",
    justifyContent: "space-between",
    color: "#475569"
  },

  emptyState: {
    textAlign: "center",
    padding: "30px 15px",
    color: "#64748b"
  },

  emptyIcon: {
    width: "50px",
    height: "50px",
    margin: "0 auto 12px",
    borderRadius: "14px",
    background: "#f1f5f9",
    color: "#64748b",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "20px",
    fontWeight: "800"
  },

  welcomeCard: {
    background: "white",
    border: "1px solid #e2e8f0",
    borderRadius: "18px",
    padding: "70px 30px",
    textAlign: "center",
    boxShadow:
      "0 2px 8px rgba(15, 23, 42, 0.04)"
  },

  welcomeIcon: {
    width: "70px",
    height: "70px",
    margin: "0 auto 18px",
    borderRadius: "20px",
    background: "#eff6ff",
    color: "#2563eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "30px",
    fontWeight: "800"
  },

  loadingCard: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "12px",
    padding: "25px",
    background: "white",
    borderRadius: "14px",
    border: "1px solid #e2e8f0",
    color: "#64748b"
  },

  spinner: {
    width: "18px",
    height: "18px",
    border:
      "3px solid #dbeafe",
    borderTop:
      "3px solid #2563eb",
    borderRadius: "50%"
  }
};

export default Budgets;