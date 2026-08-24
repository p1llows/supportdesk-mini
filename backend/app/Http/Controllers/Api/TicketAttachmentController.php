<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\ChecksTicketAccess;
use App\Http\Controllers\Controller;
use App\Models\Ticket;
use App\Models\TicketAttachment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class TicketAttachmentController extends Controller
{
    use ChecksTicketAccess;

    /**
     * Stream an attachment file for download.
     *
     * Authorization order:
     *   1. Ticket-access scoping (requester=own, agent=department, admin=all).
     *   2. Ticket-ownership check — the attachment must belong to the ticket
     *      in the URL; mismatches return 404 (IDOR prevention, same
     *      semantics as the comments endpoint).
     *   3. Stream the stored file with its original filename.
     */
    public function download(Request $request, Ticket $ticket, TicketAttachment $attachment): StreamedResponse|JsonResponse
    {
        // 1. Ticket-access scoping (requester=own, agent=department, admin=all)
        if ($response = $this->authorizeTicketAccess($request, $ticket)) {
            return $response;
        }

        // 2. The attachment must belong to the ticket in the URL (IDOR prevention,
        //    same semantics as the comments endpoint: 404, not 403).
        if ((int) $attachment->ticket_id !== (int) $ticket->id) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Attachment not found',
            ], 404);
        }

        // 3. Stream the stored file with its original name.
        return Storage::disk('local')->download(
            $attachment->stored_path,
            $attachment->original_name
        );
    }
}
