# Operations integration and monitoring (https://neon1.tech/)

A small business's point-of-sale, order tracking, and cameras each had their own screen, and none showed the business as a whole.

*small local business · workflows*

neon1 engagement, 2025

**faster time to act** · from the floor or from home

| | In short |
|---|---|
| **The problem** | The point-of-sale, order tracking, and cameras each lived on their own screen. |
| **The work** | Tied their events together on AWS, shown on wall tablets and a remote view. |
| **The results** | Compared how quickly the owner could act on a problem, before and after. |
| **After handover** | I manage it remotely, and computer vision is next. |

## The problem

A small business ran on systems that didn't know about each other: a cloud point-of-sale and order-tracking system, a camera system, and what staff kept in their heads about where each order stood. To see whether the business was on track, the owner had to be there, or open each system in turn.

The ask: see what's happening, from the floor or from home, without one more screen for staff to look after.

## The work

I kept each system as the record for what it does best: point-of-sale for sales, order tracking for where each order is, and the cameras for video. Nothing was replaced. I added only what joins them.

- Events come in through each vendor's API or webhooks to a small AWS middleware with a Node.js app, which keeps a history and ties them together, such as an order, its items, and the front counter.
- Wall-mounted tablets show the business's state, and the owner sees the same view remotely through an authenticated browser page.
- Cameras, tablets, and other devices sit on their own network, apart from staff computers. No camera is exposed to the internet, and each vendor key has only the access it needs.
- Every automated action is logged.
- It fails safe. If the cameras or a vendor API stop answering, the point-of-sale keeps working and the view says its data is stale. If the AWS part fails, the business carries on as before.

I used middleware only where it earned its place, joining events across systems and keeping their history. For anything else, each vendor's own app was cheaper, so that's what staff still use.

## The results

The measure was the owner's time to act: how long it took to notice and deal with a point-of-sale problem, an order that didn't match its items, or data that didn't add up. Before, that waited until the owner was on site. With the remote view alongside time on site, the owner deals with them much sooner.

## After handover

I manage the setup remotely, and the owner and staff use the tablets and the remote view day to day. Next is computer vision, starting with one event the owner wants to see, the camera view that shows it, and a check on false alarms and misses before anyone relies on it. The point-of-sale stays the record, and the business keeps working if the new part is down.
