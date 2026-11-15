# One view of the shop (https://neon1.tech/)

A dry cleaner's POS, garment tags, and cameras each had their own screen, and none showed the shop as a whole.

*dry cleaner · workflows*

neon1 engagement: As neon1, my first client, 2025

**faster time to act** · from the floor or from home

| | In short |
|---|---|
| **The problem** | The POS, garment tags, and cameras each lived on their own screen. |
| **The work** | Tied their events together on AWS, shown on wall tablets and a remote view. |
| **The results** | Compared how quickly the owner could act on a problem, before and after. |
| **After handover** | I manage it remotely, and computer vision is next. |

## The problem

A dry cleaner ran on systems that didn't know about each other: a cloud point-of-sale and garment-tagging system, a camera system, and what the staff kept in their heads about where each order stood. To see whether the shop was on track, the owner had to be there, or open each system in turn.

The ask: see what's happening in the shop, from the floor or from home, without giving the staff one more screen to look after.

## The work

- Kept each system as the record for what it does best: the POS for sales, the tags for where each garment is, and the cameras for video. Nothing was replaced.
- Their events come in through each vendor's API or webhooks, into a small AWS middleware with a Node.js app, which keeps a history and ties them together, such as an order, its garments, and the counter at pickup.
- Wall-mounted tablets show the shop's state, and the owner sees the same view remotely through an authenticated browser page.
- Cameras, tablets, and other devices sit on their own network, apart from staff computers. No camera is exposed to the internet, and each vendor key has only the access it needs.
- Every automated action is logged, so nothing the system does is invisible.
- It fails safe: if the cameras or a vendor API stop answering, the POS keeps working and the view says its data is stale. If the AWS part fails, the shop carries on as before.

I chose middleware only where it earned its place: joining events across systems and keeping their history. For anything else, each vendor's own app was cheaper, so that's what the staff still use.

## The results

The measure was the owner's time to act: how long it took to notice and deal with a POS problem, an order that didn't match its garments, or data that didn't add up. Before, that waited until the owner was in the shop. With the remote view alongside time on site, the owner deals with them much sooner than checking on site alone allowed.

## After handover

I manage the setup remotely, and the owner and staff use the tablets and the remote view day to day. Next is computer vision, starting with one event the owner wants to see, the camera view that shows it, and a check on false alarms and misses before anyone relies on it. The POS stays the record, and the shop keeps working if the new part is down.
