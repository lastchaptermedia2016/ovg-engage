# OVG Engage - Reseller User Guide

## Welcome to the OVG Engage Reseller Console!

This guide will help you get started with managing your clients and deploying AI-powered chat widgets on their websites.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Dashboard Overview](#dashboard-overview)
3. [Managing Clients](#managing-clients)
4. [Configuring Widgets](#configuring-widgets)
5. [Custom Services & Time Tracking](#custom-services--time-tracking)
6. [Monthly Invoicing](#monthly-invoicing)
7. [Embedding Widgets](#embedding-widgets)
8. [Troubleshooting](#troubleshooting)
9. [Support](#support)

---

## Getting Started

### Creating Your Account

1. Navigate to the **Reseller Console** at `https://your-domain.com/reseller/login`
2. Click on the **Sign Up** tab
3. Enter your:
   - Company name
   - Email address
   - Password (minimum 6 characters)
4. Click **Create Account**
5. You'll be automatically logged in and redirected to your dashboard

### Logging In

1. Go to the **Reseller Console** login page
2. Enter your email and password
3. Click **Sign In**

---

## Dashboard Overview

Your dashboard provides a comprehensive view of your reseller business with two main tabs: **Clients** and **Pricing**.

### Key Metrics

- **Total Clients** - Number of businesses you're managing
- **Total Leads** - Combined leads generated across all clients
- **Total Revenue** - Combined revenue including both monthly subscriptions **and one-time setup fees**
- **Conversion Rate** - Average conversion rate across all clients

### Quick Actions

- **Add New Client** - Quickly add a new client to your portfolio
- **Search Clients** - Find clients by name, industry, or domain
- **Switch to Pricing Tab** - Manage your pricing and profit margins

---

## Managing Clients

### Adding a New Client

1. Click the **+ Add Client** button on your dashboard
2. Fill in the client details:
   - **Client Name** - Business name
   - **Industry** - Select from dropdown (Med Spa, Dental, Legal, Real Estate, etc.)
   - **Domain** - Website URL where the widget will be embedded
   - **Location** - City/Region (optional)
   - **Phone** - Contact number (optional)
   - **Email** - Contact email (optional)
3. Click **Add Client**

### Viewing Client Details

1. Find the client in your client list
2. Click on the client name to view:
   - Basic information
   - Widget configuration status
   - Lead count and analytics

### Editing Client Information

1. Click the **Edit** icon next to the client
2. Update the information
3. Click **Save Changes**

### Removing a Client

1. Click the **Delete** icon next to the client
2. Confirm the deletion
3. **Note:** This will remove all associated data including leads and configurations

---

## Configuring Widgets

### Accessing Widget Configuration

1. From your dashboard, find the client
2. Click the **Configure** button (gear icon)
3. You'll be taken to the Widget Configuration page

### Branding Tab

Customize the visual appearance of the widget:

#### Colors
- **Primary Color** - Main brand color (click to open color picker)
- **Accent Color (Gold)** - Secondary accent color
- **Quick Colors** - Pre-selected color palette for quick selection

#### Logo & Font
- **Logo URL** - Upload your client's logo and paste the URL
- **Header Background Image URL** - Custom image for the chat widget header background
  - Recommended size: 800x200px
  - Supports JPG, PNG, WebP formats
  - Live preview shown below the input field
- **Font Family** - Choose from available fonts:
  - Inter
  - Roboto
  - Playfair Display
  - Lato
  - Montserrat
  - Open Sans

### AI Settings Tab

Configure the AI personality and behavior:

#### AI Personality
- **AI Name** - What the AI should be called (e.g., "Kim", "Assistant")
- **AI Mood** - Select the communication style:
  - ✨ **Luxurious** - Elegant, premium, high-end tone
  - 💼 **Professional** - Clean, efficient, business-like
  - 😊 **Friendly** - Warm, approachable, casual
  - 🎯 **Minimal** - Direct, concise, to-the-point
  - 🎉 **Playful** - Fun, energetic, engaging
- **Temperature** - Slider to adjust creativity (0.0 = focused, 1.0 = creative)

#### Messages & Prompts
- **Welcome Greeting** - Custom greeting message shown to visitors
- **Special Offers** - Promotional messages to include in conversations
- **System Prompt Addition** - Custom instructions for the AI (advanced)

### Add-ons Tab

Enable or disable widget features:

- **Voice Input** - Allow users to speak their messages
- **Voice Output (TTS)** - AI reads responses aloud to users
- **WhatsApp Confirmations** - Send booking confirmations via WhatsApp
- **Email Notifications** - Send email notifications for new leads

### Preview Tab

See how your widget will look on the client's website:

- Live preview of the widget with current settings
- Test different configurations in real-time
- View the embed code

---

## Custom Services & Time Tracking

OVG Engage allows you to offer custom development services to your clients beyond the standard subscription. Track time, manage projects, and bill clients for additional work.

### Accessing Custom Services

1. From your dashboard, find the client
2. Click the **three-dot menu** (⋮) on the client card
3. Select **Custom Services**

### Adding a Custom Service

1. Click the **+ Add Service** button
2. Fill in the service details:
   - **Service Name** - What the work is (e.g., "Custom API Integration")
   - **Description** - Detailed description of the work
   - **Hourly Rate** - Your billing rate (default: R850/hr)
   - **Estimated Hours** - How long you expect it to take
   - **Priority** - Low, Medium, High, or Urgent
   - **Internal Notes** - Notes for your team (not visible to client)
3. Click **Add Service**

### Service Status Workflow

Services go through a workflow to keep you and your client aligned:

| Status | Description |
|--------|-------------|
| **Pending** | Awaiting client approval |
| **Approved** | Client approved, ready to start |
| **In Progress** | Work is being done |
| **Completed** | Work finished, ready for billing |
| **Billed** | Included on an invoice |
| **Cancelled** | Service cancelled |

### Tracking Time

#### Using the Timer
1. Find the service you're working on
2. Click **Start Timer** to begin tracking
3. The timer shows as "Running..." with a green indicator
4. Click the **Stop** button when done

#### Manual Time Entry
1. Click **Manual Entry** on the service
2. Enter:
   - **Description** - What work was done
   - **Duration** - Minutes spent
3. Click **Add Time Entry**

### Viewing Time Summary

Each service shows:
- **Hourly Rate** - Your billing rate
- **Estimated** - Original time estimate
- **Time Tracked** - Actual time logged (hours and minutes)

---

## Monthly Invoicing

Generate comprehensive monthly invoices that include subscription fees, add-ons, and custom services.

### Generating an Invoice

1. Go to a client's **Custom Services** page
2. Click **Generate Monthly Invoice**
3. The system automatically calculates:
   - Subscription tier price
   - Add-on costs
   - Custom services (hours × rate)
   - 15% VAT
4. A draft invoice is created with a unique invoice number

### Invoice Components

| Component | Description |
|-----------|-------------|
| **Subscription** | Client's monthly plan fee |
| **Add-ons** | Enabled features (Voice, WhatsApp, etc.) |
| **Custom Services** | Billable hours from completed services |
| **Subtotal** | Sum of all components |
| **VAT (15%)** | Tax calculation |
| **Total** | Final amount due |

### Invoice Status

| Status | Description |
|--------|-------------|
| **Draft** | Not yet sent to client |
| **Sent** | Delivered to client |
| **Paid** | Payment received |
| **Overdue** | Past due date |
| **Cancelled** | Voided |

### Invoice Number Format

Invoices use the format: `INV-YYYY-NNNN`
- Example: `INV-2026-0001`

---

## Embedding Widgets

### Getting the Embed Code

1. Configure the widget for your client
2. Go to the **Preview** tab
3. Click **Copy Embed Code**

### Installing on Client Website

The embed code consists of two parts:

```html
<script>
  window.ovgConfig = {
    tenantId: "YOUR_CLIENT_ID",
    widgetUrl: "https://ovg-engage.vercel.app"
  };
</script>
<script src="https://ovg-engage.vercel.app/src/loader.js"></script>
```

#### Option 1: Add to HTML

Paste the code just before the closing `</body>` tag on every page where you want the widget to appear.

#### Option 2: Use Google Tag Manager

1. Create a new **Custom HTML** tag
2. Paste the embed code
3. Set trigger to **All Pages**
4. Publish the container

#### Option 3: WordPress

1. Install a header/footer plugin (e.g., "Insert Headers and Footers")
2. Go to Settings → Insert Headers and Footers
3. Paste the code in the **Footer** section
4. Save changes

### Testing the Widget

1. Visit the client's website
2. Look for the chat widget in the bottom-right corner
3. Click to open and test the conversation
4. Verify that:
   - The widget displays correctly
   - Colors match the branding
   - AI responds appropriately
   - Voice features work (if enabled)

---

## Troubleshooting

### Widget Not Appearing

**Problem:** The widget doesn't show up on the website.

**Solutions:**
1. Verify the embed code is correctly pasted
2. Check that the `tenantId` matches your client's ID
3. Clear browser cache and refresh
4. Check browser console for errors (F12 → Console)

### Widget Appears But Doesn't Respond

**Problem:** The widget is visible but doesn't respond to messages.

**Solutions:**
1. Check internet connection
2. Verify the widget URL is correct
3. Check browser console for API errors
4. Ensure the client's subscription is active

### Voice Features Not Working

**Problem:** Voice input/output doesn't work.

**Solutions:**
1. Ensure voice features are enabled in the Add-ons tab
2. Check browser permissions for microphone access
3. Use a modern browser (Chrome, Edge, Safari)
4. Test on HTTPS (voice features require secure connection)

### AI Responses Seem Generic

**Problem:** The AI doesn't sound like it matches the client's brand.

**Solutions:**
1. Adjust the **AI Mood** setting
2. Customize the **System Prompt Addition** with brand-specific instructions
3. Update the **Welcome Greeting** to set the right tone
4. Add industry-specific keywords to the **Special Offers** section

### Branding Not Applied

**Problem:** Widget colors don't match the configured branding.

**Solutions:**
1. Click **Save Changes** after updating colors
2. Clear browser cache
3. Hard refresh the page (Ctrl+Shift+R or Cmd+Shift+R)
4. Verify the correct client is selected

---

## Support

### Help Resources

- **Documentation:** [Link to full documentation]
- **Video Tutorials:** [Link to video library]
- **FAQ:** [Link to frequently asked questions]

### Contact Support

If you need assistance:

- **Email:** support@your-domain.com
- **Phone:** +1 (555) 123-4567
- **Live Chat:** Available in the Reseller Console (bottom-right corner)

### Reporting Bugs

When reporting an issue, please include:
1. Description of the problem
2. Steps to reproduce
3. Screenshots (if applicable)
4. Browser and operating system
5. Client name and tenant ID

---

## Best Practices

### For Optimal Results

1. **Customize Each Client** - Don't use the same settings for all clients
2. **Test Thoroughly** - Always test the widget after configuration
3. **Monitor Performance** - Check the dashboard regularly for lead activity
4. **Update Regularly** - Keep client information and offerings current
5. **Use Analytics** - Review conversion rates to optimize performance

### Client Onboarding Checklist

- [ ] Add client with complete information
- [ ] Select appropriate subscription tier
- [ ] Configure branding to match their website
- [ ] Set appropriate AI mood and personality
- [ ] Enable relevant add-ons
- [ ] Test widget functionality
- [ ] Provide embed code to client
- [ ] Discuss any custom service needs
- [ ] Follow up after 1 week to check performance

---

## Pricing Management

The **Pricing** tab allows you to set custom prices for your clients and track your profit margins in real-time.

### Accessing Pricing Management

1. From your dashboard, click the **Pricing** tab
2. You'll see two sections: **Subscription Plans** and **Add-ons**

### Setting Custom Prices

#### For Subscription Plans

1. Click **Edit Prices** to enter edit mode
2. For each plan, enter your custom price in the input field
3. The system shows:
   - **Base Price** - The standard price (what you pay to us)
   - **Your Price** - What you charge your clients
   - **Your Profit** - The difference (shown in green if profitable, red if loss)
4. Click **Done** to save your changes

#### For Add-ons

1. Follow the same process as subscription plans
2. Each add-on shows its base cost and allows custom pricing
3. Profit margins are calculated automatically

### Understanding Profit Margins

- **Green Profit Display**: You're charging more than the base cost (profitable)
- **Red Profit Display**: You're charging less than the base cost (loss)
- **Minimum Price**: The system enforces a minimum price equal to the base cost

### Pricing Strategy Tips

1. **Research Your Market**: Understand what competitors charge
2. **Consider Value-Add**: Bundle services to justify higher prices
3. **Tiered Pricing**: Offer different price points for different client needs
4. **Monitor Margins**: Keep an eye on your profit percentages
5. **Adjust Regularly**: Review and update prices based on performance

### Example Pricing Structure

| Plan | Base Cost | Your Price | Your Profit |
|------|-----------|------------|-------------|
| Starter | R299 | R499 | R200 |
| Professional | R599 | R999 | R400 |
| Enterprise | R1,199 | R1,999 | R800 |

---

## Version Information

**Guide Version:** 3.0  
**Last Updated:** April 2026  
**Platform:** OVG Engage Reseller Console  
**New Features:** Pricing Management, White-Labeled Chat Widget, Custom Services, Time Tracking, Monthly Invoicing, VIP Customer Console, Header Background Images

---

## VIP Customer Console (Premium Add-On)

**Access:** Customer presses `SHIFT + V` (configurable)

### What is the VIP Customer Console?

The VIP Customer Console is a **premium add-on** that provides your clients' customers with a personalized dashboard showing:
- Their VIP tier status (Standard, Silver, Gold, Platinum)
- Rewards points balance
- Booking history
- Exclusive personalized offers
- Total investment/spending

### Enabling VIP Console for a Client

1. Go to **Client Configuration** for the desired client
2. Navigate to the **VIP Console** tab
3. Toggle **"Enable VIP Console"** to ON
4. Configure settings:
   - **Access Method**: Choose between shortcut, password, or access code
   - **Shortcut Key**: Customize the keyboard shortcut (default: SHIFT+V)
   - **Rewards Rate**: Set points per dollar spent (default: 1 point per $10)

### VIP Tiers

Customers are automatically assigned tiers based on total spending:
- **Standard**: $0 - $499
- **Silver**: $500 - $999
- **Gold**: $1,000 - $1,999
- **Platinum**: $2,000+

### Creating Customer Offers

1. In Client Configuration, go to the **Offers** section
2. Click **"Create Offer"**
3. Set offer details:
   - **Customer Email**: Target specific customer
   - **Offer Type**: Percentage or fixed amount
   - **Value**: Discount amount
   - **Description**: Offer details
   - **Valid Until**: Expiration date
4. Click **Save**

### Access Methods

1. **Shortcut (Free)**: Customer presses SHIFT+V to access
2. **Password (Standard)**: Customer enters a password
3. **Access Code (Premium)**: Customer enters a unique code

### Pricing

The VIP Customer Console is available as a premium add-on:
- **Standard Tier Clients**: +$49/month
- **Premium Tier Clients**: +$29/month (discounted)
- **Enterprise Tier Clients**: Included

### Benefits for Your Clients

- **Increased Customer Loyalty**: Rewards program encourages repeat business
- **Higher Average Order Value**: Customers spend more to reach next tier
- **Personalized Marketing**: Target offers based on customer behavior
- **Premium Brand Experience**: Luxury console matches their brand aesthetic
