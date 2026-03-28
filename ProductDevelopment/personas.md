# User Personas — State Application Inventory

> Personas are living artifacts. Update them as real user research, feedback, and testing reveal new insights. These are starting hypotheses — not final definitions.

Every capability, design decision, and business rule should be traceable back to at least one persona's pain point or goal. This is the outside-in value principle in practice.

---

## Jordan — The Overloaded IT Coordinator
**System role:** Submitter | **Capabilities served:** CAP-01, CAP-03, CAP-04, CAP-05, CAP-09

Jordan is an agency IT staff member with 20 responsibilities. The annual inventory is one of them — and the least enjoyable.

**Pain points**
- The spreadsheet gets pulled out once a year and filled in from memory — the data is stale before it's even submitted
- Reminder emails from the state IT authority feel like pressure, not support
- No easy way to know what's changed since last year without digging through emails and tickets
- A new system feels like more work, not less

**Goals**
- Finish the certification with minimum disruption to other work
- Something fast and simple — not another system to learn
- Know exactly what needs updating without having to hunt for it

> **Critical insight:** Jordan's behavior determines whether this product succeeds or fails. If Jordan doesn't keep the inventory updated continuously, everyone else gets bad data. The product must make updating easier than ignoring it.

---

## Maria — The Accountability-Driven IT Director
**System role:** Agency Admin | **Capabilities served:** CAP-01, CAP-04, CAP-05, CAP-10

Maria leads agency IT and signs off on the annual certification. She doesn't do the data entry but is accountable for its accuracy.

**Pain points**
- Signs off on certification but doesn't trust the data her team submits
- Has been surprised by aging or unsupported systems she didn't know about
- No visibility into inventory health without asking her team directly
- Worried about audit exposure if the data turns out to be wrong

**Goals**
- Confidence that the inventory is accurate before she signs off
- Visibility into risks — aging technology, unsupported versions, AI-enabled apps — without digging into data herself
- Be able to act on problems before they become compliance issues

> **Critical insight:** Maria needs a dashboard that tells her what to worry about — not a spreadsheet she has to interpret herself.

---

## Derek — The WaTech Portfolio Analyst
**System role:** Platform Admin | **Capabilities served:** CAP-03, CAP-06, CAP-07, CAP-08

Derek works at the state IT authority and is responsible for making sense of what agencies submit. Today, that means weeks of manual data cleanup before any analysis can begin.

**Pain points**
- Spends weeks after the certification deadline cleaning inconsistent spreadsheet data
- Same vendor names spelled 10 different ways across agencies
- Fields left blank, retired systems still listed as active, wrong lifecycle statuses
- By the time data is clean enough to use, decisions have already been made without it

**Goals**
- Receive clean, consistent data so time is spent on analysis — not cleanup
- Identify shared service candidates and technology duplication across agencies quickly
- Produce reliable portfolio reports for leadership without manual data wrangling

> **Critical insight:** Derek sees the full cost of bad data. The product must make data quality automatic — not dependent on agencies doing the right thing voluntarily.

---

## Sam — The Newly Onboarded Employee
**System role:** Viewer | **Capabilities served:** CAP-01, CAP-02

Sam just joined an agency and needs to understand what systems exist, who owns them, and how they relate to the work they've been hired to do.

**Pain points**
- No easy way to find out what systems exist without asking around
- Has to dig through emails, wikis, or old documents to find basic information
- System ownership and contacts are unclear or out of date

**Goals**
- Find information about agency systems quickly without needing to ask someone
- Understand who owns a system and who to contact when something is wrong
- Get up to speed on the agency's technology landscape without a guided tour

> **Critical insight:** Sam represents a secondary but meaningful value of continuous inventory — it becomes a living reference, not just a compliance artifact.

---

## Thomas — The Legislative Reporting Executive
**System role:** Platform Admin (consumer) | **Capabilities served:** CAP-07

Thomas is the State CIO. He needs reliable statewide data to answer questions from the Governor's office and Legislature — often with little notice.

**Pain points**
- Asked for statewide views on aging technology and AI adoption — currently based on year-old data
- Cannot make confident funding decisions without knowing what agencies actually have
- Legislative reports require accurate, timely data that today takes weeks of manual assembly

**Goals**
- Timely, reliable data to support funding decisions and legislative reporting
- Statewide visibility into technology duplication, AI adoption, and aging infrastructure
- Answers without managing a tool — just needs accurate information when asked

> **Critical insight:** Thomas is the reason CAP-07 (Portfolio Intelligence) exists. The value of continuous inventory flows upward — from Jordan updating a record to Thomas answering a question from the Governor's office.

---

## The Value Chain

These personas form a chain. Each one depends on the one before them doing their job well:

```
Jordan updates records continuously
    ↓
Maria has confidence in her agency's data
    ↓
Derek receives clean, consistent data across all agencies
    ↓
Thomas gets reliable statewide portfolio intelligence
    ↓
The Governor and Legislature get accurate answers
```

Sam benefits at every level — a well-maintained inventory is a living reference for anyone who needs to understand the agency's technology landscape.
