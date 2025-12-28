const membershipService = require('../services/membershipService');

const CHECKOUT_BASE_URL = process.env.MEMBERSHIP_CHECKOUT_URL || 'https://payments.mock/membership';

exports.startCheckout = async (req, res, next) => {
    try {
        const provider = req.body?.provider || membershipService.DEFAULT_PROVIDER;
        const amountCents = parseInt(req.body?.amount_cents || membershipService.DEFAULT_PRICE, 10);

        const { membership, providerId } = await membershipService.createPendingMembership(req.user.id, provider, amountCents);

        const checkoutUrl = `${CHECKOUT_BASE_URL}?subscription=${providerId}&amount=${amountCents}`;

        res.status(201).json({
            checkoutUrl,
            providerSubscriptionId: providerId,
            membership
        });
    } catch (error) {
        next(error);
    }
};

exports.getStatus = async (req, res, next) => {
    try {
        const membership = await membershipService.getLatestMembership(req.user.id);
        const isActive = Boolean(membership && membership.status === 'active' && new Date(membership.end_date) > new Date());
        res.json({ membership, isActive });
    } catch (error) {
        next(error);
    }
};

exports.handleRenewalWebhook = async (req, res, next) => {
    try {
        const { provider_subscription_id, provider, amount_cents } = req.body;
        if (!provider_subscription_id) {
            return res.status(400).json({ message: 'Missing provider_subscription_id' });
        }

        const membership = await membershipService.activateMembership({
            providerSubscriptionId: provider_subscription_id,
            provider,
            amountCents: amount_cents
        });

        res.json({ success: true, membership });
    } catch (error) {
        next(error);
    }
};

exports.handleExpirationWebhook = async (req, res, next) => {
    try {
        const { provider_subscription_id } = req.body;
        if (!provider_subscription_id) {
            return res.status(400).json({ message: 'Missing provider_subscription_id' });
        }

        const membership = await membershipService.expireMembership(provider_subscription_id);
        res.json({ success: true, membership });
    } catch (error) {
        next(error);
    }
};

// Dev-only: Simulate completing payment for a pending membership
exports.devCompleteCheckout = async (req, res, next) => {
    try {
        if (process.env.NODE_ENV === 'production') {
            return res.status(404).json({ message: 'Not found' });
        }

        const { provider_subscription_id } = req.body;
        if (!provider_subscription_id) {
            return res.status(400).json({ message: 'Missing provider_subscription_id' });
        }

        const membership = await membershipService.activateMembership({
            providerSubscriptionId: provider_subscription_id
        });

        res.json({ 
            success: true, 
            message: 'Payment simulated - membership activated',
            membership 
        });
    } catch (error) {
        next(error);
    }
};
