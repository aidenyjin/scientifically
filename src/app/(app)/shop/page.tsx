import { Character } from "@/characters/Character";
import { GemIcon, HeartIcon, SnowflakeIcon } from "@/components/icons";
import { ShopItemCard, type ShopCardItem } from "@/components/shop/ShopItemCard";
import { Card } from "@/components/ui/Card";
import { doubleXpRemainingMs, purchaseBlocker, SHOP_ITEMS, GAME, type ShopItem } from "@/game";
import { now } from "@/lib/clock";
import { requireUser } from "@/server/repo/users";
import { syncPlayer } from "@/server/services/player";
import { HeartTimer } from "@/components/shell/HeartTimer";

const BLOCKED: Record<string, ShopCardItem["blocked"]> = {
  not_enough_gems: null, // keep showing the price, just disabled
  max_owned: { label: "Maxed", tone: "neutral" },
  hearts_full: { label: "Full", tone: "neutral" },
  already_owned: { label: "Owned", tone: "owned" },
};

const SLOT_COPY: Record<string, string> = {
  head: "A hat for any character in the cast.",
  eyes: "Eyewear for any character in the cast.",
  neck: "Neckwear for any character in the cast.",
};

export default async function ShopPage() {
  const user = await requireUser();
  const t = now();
  const player = await syncPlayer(user, t);
  const w = player.wallet;

  const toCard = (item: ShopItem): ShopCardItem => {
    const reason = purchaseBlocker(item, w, t);
    let status: string | undefined;
    let statusTone: ShopCardItem["statusTone"];
    if (item.kind === "streakFreeze") status = `Equipped ${w.streakFreezes} / ${item.maxOwned}`;
    if (item.kind === "heartRefill") status = `${player.hearts} / ${GAME.hearts.max} hearts`;
    if (item.kind === "doubleXp" && player.doubleXp) {
      status = `Active · ${Math.ceil(doubleXpRemainingMs(w, t) / 60000)} min left · buy again for +${item.minutes} min`;
      statusTone = "active";
    }
    if (reason === "not_enough_gems") status = `${status ? `${status} · ` : ""}Need ${item.price - w.gems} more gems`;
    return {
      id: item.id,
      name: item.name,
      description: item.description,
      price: item.price,
      icon: item.icon,
      blocked: reason ? BLOCKED[reason] : null,
      disabled: reason !== null,
      status,
      statusTone,
    };
  };
  const powerUps = SHOP_ITEMS.filter((i) => i.kind !== "cosmetic");
  const outfits = SHOP_ITEMS.filter((i) => i.kind === "cosmetic");

  return (
    <div className="grid gap-8">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold">Shop</h1>
          <p className="mt-1 text-ink-soft">Spend gems on power-ups and outfits.</p>
        </div>
        <div className="flex items-center gap-2 rounded-2xl border-2 border-line bg-surface px-4 py-2 font-display text-xl font-bold text-gem">
          <GemIcon size={26} /> {w.gems}
        </div>
      </header>

      <div className="grid grid-cols-2 gap-4">
        <Card className="flex items-center gap-3">
          <HeartIcon size={36} />
          <div>
            <p className="font-display text-lg font-semibold">
              {player.hearts} / {GAME.hearts.max} hearts
            </p>
            <HeartTimer nextHeartAt={player.nextHeartAt?.toISOString() ?? null} />
          </div>
        </Card>
        <Card className="flex items-center gap-3">
          <SnowflakeIcon size={36} />
          <div>
            <p className="font-display text-lg font-semibold">{w.streakFreezes} streak freezes</p>
            <p className="text-sm font-bold text-muted">Used if you miss a day</p>
          </div>
        </Card>
      </div>

      <section>
        <h2 className="font-display text-xl font-semibold">Power-ups</h2>
        <ul className="mt-2">
          {powerUps.map((item) => (
            <ShopItemCard key={item.id} item={toCard(item)} />
          ))}
        </ul>
      </section>

      <section>
        <h2 className="font-display text-xl font-semibold">Outfits</h2>
        <p className="text-sm text-ink-soft">Dress up the cast — equip outfits from your profile.</p>
        <ul className="mt-2">
          {outfits.map((item) => (
            <ShopItemCard
              key={item.id}
              item={{ ...toCard(item), description: SLOT_COPY[item.kind === "cosmetic" ? item.slot : "head"] }}
              preview={
                item.kind === "cosmetic" ? (
                  // Zoomed on Lumi's head so the item reads at a glance.
                  <span className="block self-start pt-1">
                    <Character id="lumi" expression="happy" size={88} outfit={[item.cosmeticId]} />
                  </span>
                ) : undefined
              }
            />
          ))}
        </ul>
      </section>
    </div>
  );
}
