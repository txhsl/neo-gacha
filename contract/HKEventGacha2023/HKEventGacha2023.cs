using Neo;
using Neo.SmartContract.Framework;
using Neo.SmartContract.Framework.Attributes;
using Neo.SmartContract.Framework.Services;
using System.ComponentModel;

namespace HKEventGacha2023
{
    [DisplayName("HKEventGacha2023")]
    [ManifestExtra("Author", "txhsl")]
    [ManifestExtra("Description", "This is a gacha machine")]
    public class HKEventGacha2023 : SmartContract
    {
        [DisplayName("Twist")]
        public static event TwistEvent onTwist;
        public delegate void TwistEvent(UInt160 account);

        public static bool Twist(UInt160 account)
        {
            if (!Runtime.CheckWitness(account)) return false;
            onTwist(account);
            return true;
        }
    }
}
