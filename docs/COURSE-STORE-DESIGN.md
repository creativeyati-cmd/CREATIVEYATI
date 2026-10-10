# Course store redesign

Course listing, single-course detail and checkout now share a green editorial visual direction, image-led cards and responsive rounded panels. Reference: https://id.pinterest.com/pin/713820609690950681/ (course-detail design by Kukuh Andik / Sebo). Reference artwork is not copied into the product.

The listing adds client-side search and category filters over published courses. Server-rendered cards retain the existing course price rules. Course detail retains enrolment checks, preview restrictions, course media and protected resource links. Checkout retains verified-email requirements, server-validated coupons and payment initialization; only presentation and explanatory text change.

Validation: production build and targeted ESLint; sample-data browser checks at 1440, 768 and 390 pixels; search/category/reset interactions; curriculum expansion and enrolment destinations; mocked coupon response to check total updates and payment gating. No live charge was made. Temporary sample routes are removed before deployment.

## Checkout reference refinement

Checkout now follows the supplied Documents/checkout desktop and phone references: white surface, compact left order summary, vertical divider, grouped account/access/payment steps and full-width payment CTA. Mobile places the action steps before the detailed summary. Uses only the existing Bachs provider and actual course prices; no shipping fields, invented payment options or certification badges. Coupon totals share state across both columns; editing a coupon clears stale discounts and successful validation adopts the normalized code. Build and responsive checks passed, with mocked coupon/payment errors and free/unverified states checked.
