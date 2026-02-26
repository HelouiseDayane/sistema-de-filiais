<?php


namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Redis;

class StockUpdated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $productId;
    public $type;
    public $stockData;

    /**
     * Create a new event instance.
     */
    public function __construct($productId, $type, $stockData = null)
    {
        $this->productId = $productId;
        $this->type = $type;
        $this->stockData = $stockData ?? $this->getStockData($productId);
    }

    /**
     * Get the channels the event should broadcast on.
     */
    public function broadcastOn(): array
    {
        return [
            new Channel('stock-updates'),
            new Channel("product.{$this->productId}")
        ];
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'stock.updated';
    }

    /**
     * Get the data to broadcast.
     */
    public function broadcastWith(): array
    {
        return [
            'product_id' => $this->productId,
            'type' => $this->type,
            'stock_data' => $this->stockData,
            'timestamp' => now()->toISOString()
        ];
    }

    private function getStockData($productId)
    {
        $totalStock = Redis::get("product_stock_{$productId}") ?? 0;
        $reservedStock = Redis::get("product_reserved_{$productId}") ?? 0;
        $availableStock = max(0, $totalStock - $reservedStock);

        return [
            'available_stock' => $availableStock,
            'total_stock' => (int)$totalStock,
            'reserved_stock' => (int)$reservedStock,
            'is_available' => $availableStock > 0,
            'is_low_stock' => $availableStock <= 5 && $availableStock > 0
        ];
    }
}