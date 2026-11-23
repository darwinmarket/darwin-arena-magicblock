/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/darwin_arena.json`.
 */
export type DarwinArena = {
  "address": "GnQC4MjzjS8AZvtj5VR64ovJupSm93yCiYz1ZkLyzFNp",
  "metadata": {
    "name": "darwinArena",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Darwin Arena: 1v1 crypto basket duels on MagicBlock Ephemeral Rollups"
  },
  "instructions": [
    {
      "name": "applyMutation",
      "docs": [
        "VRF callback: the oracle's randomness picks the mutation's kind and its",
        "asset(s). Only MagicBlock's VRF program can sign this."
      ],
      "discriminator": [
        101,
        40,
        14,
        241,
        91,
        225,
        79,
        73
      ],
      "accounts": [
        {
          "name": "vrfProgramIdentity",
          "docs": [
            "Scoped VRF identity PDA, bound to this program. Its presence as a signer proves",
            "the callback was issued by the VRF program for this program."
          ],
          "signer": true
        },
        {
          "name": "duel",
          "writable": true
        }
      ],
      "args": [
        {
          "name": "randomness",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "index",
          "type": "u8"
        }
      ]
    },
    {
      "name": "cancelDuel",
      "docs": [
        "Get stakes back from a duel that never started: an empty table the",
        "opener walks away from (opener only), or a draft that ran out without",
        "both commitments (anyone, after the grace period). Each seated player is",
        "refunded to their own token account."
      ],
      "discriminator": [
        83,
        124,
        224,
        237,
        235,
        44,
        38,
        57
      ],
      "accounts": [
        {
          "name": "caller",
          "signer": true
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "table",
          "writable": true
        },
        {
          "name": "duel",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  117,
                  101,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "duel.id",
                "account": "duel"
              }
            ]
          }
        },
        {
          "name": "usdc0",
          "writable": true
        },
        {
          "name": "usdc1",
          "writable": true,
          "optional": true
        },
        {
          "name": "vault",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": []
    },
    {
      "name": "commitBasket",
      "docs": [
        "Lock a basket during the draft: only `sha256(duel || player || weights ||",
        "salt)` goes on chain. Signed by the wallet, or by a MagicBlock session key",
        "whose `SessionTokenV2` names the player as authority. The signer becomes",
        "the key allowed to act for this player inside the rollup."
      ],
      "discriminator": [
        170,
        1,
        227,
        80,
        85,
        10,
        6,
        185
      ],
      "accounts": [
        {
          "name": "signer",
          "docs": [
            "The wallet, or a session key authorised by it."
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "player"
        },
        {
          "name": "duel",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  117,
                  101,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "duel.id",
                "account": "duel"
              }
            ]
          }
        },
        {
          "name": "sessionToken",
          "docs": [
            "MagicBlock session token (`session-keys` program), required unless the",
            "player signs directly."
          ],
          "optional": true
        }
      ],
      "args": [
        {
          "name": "commitment",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ]
    },
    {
      "name": "delegateDuel",
      "docs": [
        "Both baskets are committed: hand the duel to the Ephemeral Rollup.",
        "Permissionless; the second committer's client appends it, the crank does",
        "it otherwise."
      ],
      "discriminator": [
        126,
        33,
        7,
        30,
        154,
        115,
        199,
        100
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "bufferDuel",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  117,
                  102,
                  102,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "duel"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                234,
                128,
                169,
                124,
                177,
                103,
                163,
                88,
                254,
                69,
                218,
                163,
                134,
                242,
                171,
                60,
                4,
                185,
                61,
                33,
                55,
                75,
                175,
                215,
                186,
                177,
                135,
                225,
                65,
                83,
                160,
                241
              ]
            }
          }
        },
        {
          "name": "delegationRecordDuel",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  108,
                  101,
                  103,
                  97,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "duel"
              }
            ],
            "program": {
              "kind": "account",
              "path": "delegationProgram"
            }
          }
        },
        {
          "name": "delegationMetadataDuel",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  108,
                  101,
                  103,
                  97,
                  116,
                  105,
                  111,
                  110,
                  45,
                  109,
                  101,
                  116,
                  97,
                  100,
                  97,
                  116,
                  97
                ]
              },
              {
                "kind": "account",
                "path": "duel"
              }
            ],
            "program": {
              "kind": "account",
              "path": "delegationProgram"
            }
          }
        },
        {
          "name": "duel",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  117,
                  101,
                  108
                ]
              },
              {
                "kind": "arg",
                "path": "id"
              }
            ]
          }
        },
        {
          "name": "ownerProgram",
          "address": "GnQC4MjzjS8AZvtj5VR64ovJupSm93yCiYz1ZkLyzFNp"
        },
        {
          "name": "delegationProgram",
          "address": "DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "id",
          "type": "u64"
        }
      ]
    },
    {
      "name": "faucet",
      "docs": [
        "Devnet faucet: 100 test USDC, once every 10 minutes per wallet."
      ],
      "discriminator": [
        0,
        98,
        59,
        30,
        144,
        142,
        113,
        12
      ],
      "accounts": [
        {
          "name": "user",
          "writable": true,
          "signer": true
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "claim",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  102,
                  97,
                  117,
                  99,
                  101,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "user"
              }
            ]
          }
        },
        {
          "name": "usdcMint",
          "writable": true
        },
        {
          "name": "userUsdc",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "finishDuel",
      "docs": [
        "The duel is over: commit it and hand it back to Solana for `settle`."
      ],
      "discriminator": [
        181,
        31,
        60,
        158,
        38,
        75,
        188,
        200
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "duel",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  117,
                  101,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "duel.id",
                "account": "duel"
              }
            ]
          }
        },
        {
          "name": "magicProgram",
          "address": "Magic11111111111111111111111111111111111111"
        },
        {
          "name": "magicContext",
          "writable": true,
          "address": "MagicContext1111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "initProfile",
      "docs": [
        "Create the player's on-chain profile: name, rank points, record, history."
      ],
      "discriminator": [
        210,
        162,
        212,
        95,
        95,
        186,
        89,
        119
      ],
      "accounts": [
        {
          "name": "user",
          "writable": true,
          "signer": true
        },
        {
          "name": "profile",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  102,
                  105,
                  108,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "user"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "name",
          "type": "string"
        }
      ]
    },
    {
      "name": "initTable",
      "docs": [
        "One table per stake tier. Holds at most one duel waiting for a rival."
      ],
      "discriminator": [
        236,
        14,
        14,
        155,
        160,
        169,
        133,
        111
      ],
      "accounts": [
        {
          "name": "admin",
          "writable": true,
          "signer": true
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "table",
          "writable": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "tier",
          "type": "u8"
        }
      ]
    },
    {
      "name": "initialize",
      "docs": [
        "Config PDA. The test-USDC mint (mint authority = config) and the vault",
        "(a token account owned by config, escrowing every stake) are created by",
        "the client in the same transaction; this checks and records them."
      ],
      "discriminator": [
        175,
        175,
        109,
        31,
        13,
        152,
        155,
        237
      ],
      "accounts": [
        {
          "name": "admin",
          "writable": true,
          "signer": true
        },
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "usdcMint"
        },
        {
          "name": "vault"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "joinDuel",
      "docs": [
        "Take the seat across: escrow the stake, the 60 s draft starts now."
      ],
      "discriminator": [
        7,
        247,
        76,
        103,
        101,
        139,
        254,
        61
      ],
      "accounts": [
        {
          "name": "player",
          "writable": true,
          "signer": true
        },
        {
          "name": "profile",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  102,
                  105,
                  108,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "player"
              }
            ]
          }
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "table",
          "writable": true
        },
        {
          "name": "duel",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  117,
                  101,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "duel.id",
                "account": "duel"
              }
            ]
          }
        },
        {
          "name": "playerUsdc",
          "writable": true
        },
        {
          "name": "vault",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": []
    },
    {
      "name": "mintTrophy",
      "docs": [
        "\"Mint this basket\": the winner of a settled duel records the winning",
        "basket as an on-chain trophy, one per duel, owned by the winner."
      ],
      "discriminator": [
        215,
        184,
        115,
        168,
        63,
        228,
        76,
        13
      ],
      "accounts": [
        {
          "name": "winner",
          "writable": true,
          "signer": true
        },
        {
          "name": "duel",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  117,
                  101,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "duel.id",
                "account": "duel"
              }
            ]
          }
        },
        {
          "name": "trophy",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  111,
                  112,
                  104,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "duel"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "openDuel",
      "docs": [
        "Sit at an empty table: escrow the stake and open a duel waiting for a rival."
      ],
      "discriminator": [
        57,
        46,
        157,
        124,
        71,
        205,
        196,
        29
      ],
      "accounts": [
        {
          "name": "player",
          "writable": true,
          "signer": true
        },
        {
          "name": "profile",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  102,
                  105,
                  108,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "player"
              }
            ]
          }
        },
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "table",
          "writable": true
        },
        {
          "name": "duel",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  117,
                  101,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "config.duel_count",
                "account": "config"
              }
            ]
          }
        },
        {
          "name": "playerUsdc",
          "writable": true
        },
        {
          "name": "vault",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "tier",
          "type": "u8"
        }
      ]
    },
    {
      "name": "processUndelegation",
      "discriminator": [
        196,
        28,
        41,
        206,
        48,
        37,
        51,
        167
      ],
      "accounts": [
        {
          "name": "baseAccount",
          "writable": true
        },
        {
          "name": "buffer",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  110,
                  100,
                  101,
                  108,
                  101,
                  103,
                  97,
                  116,
                  101,
                  45,
                  98,
                  117,
                  102,
                  102,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "baseAccount"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                181,
                183,
                0,
                225,
                242,
                87,
                58,
                192,
                204,
                6,
                34,
                1,
                52,
                74,
                207,
                151,
                184,
                53,
                6,
                235,
                140,
                229,
                25,
                152,
                204,
                98,
                126,
                24,
                147,
                128,
                167,
                62
              ]
            }
          }
        },
        {
          "name": "payer",
          "writable": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "accountSeeds",
          "type": {
            "vec": "bytes"
          }
        }
      ]
    },
    {
      "name": "rebalance",
      "docs": [
        "Shift weights mid-duel. Same assets, 5 % steps, 100 % total, a frozen asset",
        "untouched; twice per duel. Session-key signed, on the rollup, no fee."
      ],
      "discriminator": [
        108,
        158,
        77,
        9,
        210,
        52,
        88,
        62
      ],
      "accounts": [
        {
          "name": "signer",
          "signer": true
        },
        {
          "name": "duel",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  117,
                  101,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "duel.id",
                "account": "duel"
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "weights",
          "type": {
            "array": [
              "u8",
              6
            ]
          }
        }
      ]
    },
    {
      "name": "requestMutation",
      "docs": [
        "Ask MagicBlock's VRF for mutation `index` once its second has come.",
        "Permissionless: whoever is watching the duel (either client, the crank)",
        "may pull the trigger; nobody can choose the outcome."
      ],
      "discriminator": [
        128,
        70,
        94,
        61,
        80,
        198,
        179,
        29
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "duel",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  117,
                  101,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "duel.id",
                "account": "duel"
              }
            ]
          }
        },
        {
          "name": "oracleQueue",
          "writable": true
        },
        {
          "name": "programIdentity",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  105,
                  100,
                  101,
                  110,
                  116,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "vrfProgram",
          "address": "Vrf1RNUjXmQGjmQrQLvJHs9SNkvDJEsRVFPkfSQUwGz"
        },
        {
          "name": "slotHashes",
          "address": "SysvarS1otHashes111111111111111111111111111"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "index",
          "type": "u8"
        }
      ]
    },
    {
      "name": "revealBasket",
      "docs": [
        "Reveal a committed basket. Runs on the rollup, signed by the session key",
        "recorded at commit time, so the wallet is not asked again."
      ],
      "discriminator": [
        209,
        48,
        18,
        8,
        65,
        74,
        167,
        93
      ],
      "accounts": [
        {
          "name": "signer",
          "signer": true
        },
        {
          "name": "duel",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  117,
                  101,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "duel.id",
                "account": "duel"
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "weights",
          "type": {
            "array": [
              "u8",
              6
            ]
          }
        },
        {
          "name": "salt",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ]
    },
    {
      "name": "setName",
      "docs": [
        "Change the profile's display name."
      ],
      "discriminator": [
        78,
        194,
        111,
        229,
        198,
        169,
        162,
        106
      ],
      "accounts": [
        {
          "name": "user",
          "signer": true
        },
        {
          "name": "profile",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  102,
                  105,
                  108,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "user"
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "name",
          "type": "string"
        }
      ]
    },
    {
      "name": "settle",
      "docs": [
        "The duel is back on Solana and finished: pay the winner (pot minus 5 %",
        "rake) or refund a draw, and write the result into both profiles."
      ],
      "discriminator": [
        175,
        42,
        185,
        87,
        144,
        131,
        102,
        212
      ],
      "accounts": [
        {
          "name": "caller",
          "signer": true
        },
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "duel",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  117,
                  101,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "duel.id",
                "account": "duel"
              }
            ]
          }
        },
        {
          "name": "profile0",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  102,
                  105,
                  108,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "duel.players [0]",
                "account": "duel"
              }
            ]
          }
        },
        {
          "name": "profile1",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  102,
                  105,
                  108,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "duel.players [1]",
                "account": "duel"
              }
            ]
          }
        },
        {
          "name": "usdc0",
          "writable": true
        },
        {
          "name": "usdc1",
          "writable": true
        },
        {
          "name": "vault",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": []
    },
    {
      "name": "startDuel",
      "docs": [
        "Start the clock once both baskets are revealed (or the reveal window has",
        "passed: a basket that was never revealed forfeits). Reads the six feeds as",
        "the reference prices and schedules the per-second `tick` crank."
      ],
      "discriminator": [
        188,
        143,
        206,
        111,
        77,
        207,
        62,
        244
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "duel",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  117,
                  101,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "duel.id",
                "account": "duel"
              }
            ]
          }
        },
        {
          "name": "magicProgram",
          "address": "Magic11111111111111111111111111111111111111"
        },
        {
          "name": "feedSol"
        },
        {
          "name": "feedJup"
        },
        {
          "name": "feedBonk"
        },
        {
          "name": "feedWif"
        },
        {
          "name": "feedJto"
        },
        {
          "name": "feedPyth"
        }
      ],
      "args": []
    },
    {
      "name": "tick",
      "docs": [
        "One step of the duel. Scheduled by `start_duel` (and callable by anyone:",
        "it only moves the duel forward along the oracle). Accrues both scores",
        "along every asset's move since the last tick, releases an expired freeze,",
        "and ends the duel when the clock runs out."
      ],
      "discriminator": [
        92,
        79,
        44,
        8,
        101,
        80,
        63,
        15
      ],
      "accounts": [
        {
          "name": "duel",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  117,
                  101,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "duel.id",
                "account": "duel"
              }
            ]
          }
        },
        {
          "name": "feedSol"
        },
        {
          "name": "feedJup"
        },
        {
          "name": "feedBonk"
        },
        {
          "name": "feedWif"
        },
        {
          "name": "feedJto"
        },
        {
          "name": "feedPyth"
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "config",
      "discriminator": [
        155,
        12,
        170,
        224,
        30,
        250,
        204,
        130
      ]
    },
    {
      "name": "duel",
      "discriminator": [
        126,
        229,
        210,
        60,
        177,
        135,
        124,
        224
      ]
    },
    {
      "name": "faucetClaim",
      "discriminator": [
        88,
        39,
        189,
        221,
        15,
        215,
        24,
        248
      ]
    },
    {
      "name": "profile",
      "discriminator": [
        184,
        101,
        165,
        188,
        95,
        63,
        127,
        188
      ]
    },
    {
      "name": "table",
      "discriminator": [
        34,
        100,
        138,
        97,
        236,
        129,
        230,
        112
      ]
    },
    {
      "name": "trophy",
      "discriminator": [
        82,
        8,
        120,
        249,
        41,
        102,
        228,
        234
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "badTier",
      "msg": "Unknown stake tier"
    },
    {
      "code": 6001,
      "name": "faucetCooldown",
      "msg": "Faucet already claimed, try again later"
    },
    {
      "code": 6002,
      "name": "badMint",
      "msg": "Wrong mint"
    },
    {
      "code": 6003,
      "name": "badVault",
      "msg": "Wrong vault"
    },
    {
      "code": 6004,
      "name": "tableBusy",
      "msg": "A duel is already waiting at this table"
    },
    {
      "code": 6005,
      "name": "notWaiting",
      "msg": "This duel is not the one waiting at the table"
    },
    {
      "code": 6006,
      "name": "selfDuel",
      "msg": "You cannot duel yourself"
    },
    {
      "code": 6007,
      "name": "badStatus",
      "msg": "Duel is not in the right phase"
    },
    {
      "code": 6008,
      "name": "unauthorized",
      "msg": "Not authorized"
    },
    {
      "code": 6009,
      "name": "sessionExpired",
      "msg": "Session key expired"
    },
    {
      "code": 6010,
      "name": "notAPlayer",
      "msg": "Not a player of this duel"
    },
    {
      "code": 6011,
      "name": "draftOver",
      "msg": "Draft is over"
    },
    {
      "code": 6012,
      "name": "draftNotOver",
      "msg": "Draft is not over yet"
    },
    {
      "code": 6013,
      "name": "badCommitment",
      "msg": "Empty commitment"
    },
    {
      "code": 6014,
      "name": "notCommitted",
      "msg": "Both baskets must be committed"
    },
    {
      "code": 6015,
      "name": "alreadyRevealed",
      "msg": "Basket already revealed"
    },
    {
      "code": 6016,
      "name": "badReveal",
      "msg": "Reveal does not match the commitment"
    },
    {
      "code": 6017,
      "name": "badBasket",
      "msg": "Invalid basket: 3-5 assets, 5% steps, 100% total"
    },
    {
      "code": 6018,
      "name": "notRevealed",
      "msg": "Both baskets must be revealed, or the reveal window must be over"
    },
    {
      "code": 6019,
      "name": "wrongFeed",
      "msg": "Unexpected price feed account"
    },
    {
      "code": 6020,
      "name": "badPrice",
      "msg": "Oracle price must be positive"
    },
    {
      "code": 6021,
      "name": "stalePrice",
      "msg": "Oracle price is stale"
    },
    {
      "code": 6022,
      "name": "badMutation",
      "msg": "Unknown mutation"
    },
    {
      "code": 6023,
      "name": "tooEarly",
      "msg": "Too early for this mutation"
    },
    {
      "code": 6024,
      "name": "alreadyRequested",
      "msg": "Mutation already requested"
    },
    {
      "code": 6025,
      "name": "noRebalanceLeft",
      "msg": "No rebalance left"
    },
    {
      "code": 6026,
      "name": "frozenAsset",
      "msg": "A frozen asset cannot be rebalanced"
    },
    {
      "code": 6027,
      "name": "badTokenAccount",
      "msg": "Not a valid token account"
    },
    {
      "code": 6028,
      "name": "insufficientFunds",
      "msg": "Not enough test USDC"
    },
    {
      "code": 6029,
      "name": "notTheWinner",
      "msg": "Only the winner of a settled duel can mint its trophy"
    }
  ],
  "types": [
    {
      "name": "config",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "admin",
            "type": "pubkey"
          },
          {
            "name": "usdcMint",
            "type": "pubkey"
          },
          {
            "name": "vault",
            "type": "pubkey"
          },
          {
            "name": "duelCount",
            "type": "u64"
          },
          {
            "name": "rakeCollected",
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "duel",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "id",
            "type": "u64"
          },
          {
            "name": "tier",
            "type": "u8"
          },
          {
            "name": "stake",
            "type": "u64"
          },
          {
            "name": "players",
            "type": {
              "array": [
                "pubkey",
                2
              ]
            }
          },
          {
            "name": "status",
            "type": "u8"
          },
          {
            "name": "createdTs",
            "type": "i64"
          },
          {
            "name": "draftDeadline",
            "type": "i64"
          },
          {
            "name": "commits",
            "docs": [
              "sha256(duel || player || weights || salt), set during the draft."
            ],
            "type": {
              "array": [
                {
                  "array": [
                    "u8",
                    32
                  ]
                },
                2
              ]
            }
          },
          {
            "name": "session",
            "docs": [
              "Key allowed to act for each player on the rollup (a session key, or the wallet)."
            ],
            "type": {
              "array": [
                "pubkey",
                2
              ]
            }
          },
          {
            "name": "sessionUntil",
            "type": {
              "array": [
                "i64",
                2
              ]
            }
          },
          {
            "name": "revealed",
            "type": {
              "array": [
                "bool",
                2
              ]
            }
          },
          {
            "name": "revealDeadline",
            "type": "i64"
          },
          {
            "name": "weights",
            "docs": [
              "Current weights in %, per asset. 0 = not in the basket."
            ],
            "type": {
              "array": [
                {
                  "array": [
                    "u8",
                    6
                  ]
                },
                2
              ]
            }
          },
          {
            "name": "startWeights",
            "docs": [
              "Weights as revealed, for the record."
            ],
            "type": {
              "array": [
                {
                  "array": [
                    "u8",
                    6
                  ]
                },
                2
              ]
            }
          },
          {
            "name": "startTs",
            "type": "i64"
          },
          {
            "name": "lastTickTs",
            "type": "i64"
          },
          {
            "name": "endTs",
            "type": "i64"
          },
          {
            "name": "settledTs",
            "type": "i64"
          },
          {
            "name": "startPrice",
            "docs": [
              "Raw oracle prices (each asset in its own feed exponent)."
            ],
            "type": {
              "array": [
                "u64",
                6
              ]
            }
          },
          {
            "name": "lastPrice",
            "type": {
              "array": [
                "u64",
                6
              ]
            }
          },
          {
            "name": "score",
            "docs": [
              "Accumulated performance, in SCORE_ONE units."
            ],
            "type": {
              "array": [
                "i64",
                2
              ]
            }
          },
          {
            "name": "mult",
            "docs": [
              "Weight multiplier per asset (DOUBLE sets 2)."
            ],
            "type": {
              "array": [
                "u8",
                6
              ]
            }
          },
          {
            "name": "frozenAsset",
            "type": "u8"
          },
          {
            "name": "frozenUntil",
            "type": "i64"
          },
          {
            "name": "mutations",
            "type": {
              "array": [
                {
                  "defined": {
                    "name": "mutationSlot"
                  }
                },
                3
              ]
            }
          },
          {
            "name": "mutationsApplied",
            "type": "u8"
          },
          {
            "name": "rebalancesLeft",
            "type": {
              "array": [
                "u8",
                2
              ]
            }
          },
          {
            "name": "ticks",
            "type": "u32"
          },
          {
            "name": "winner",
            "docs": [
              "0 or 1, DRAW, or NO_WINNER while undecided."
            ],
            "type": "u8"
          },
          {
            "name": "forfeit",
            "docs": [
              "Ended because a basket was never revealed."
            ],
            "type": "bool"
          },
          {
            "name": "taskId",
            "type": "i64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "faucetClaim",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "lastTs",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "matchRecord",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "duel",
            "type": "pubkey"
          },
          {
            "name": "opponent",
            "type": "pubkey"
          },
          {
            "name": "opponentName",
            "type": {
              "array": [
                "u8",
                20
              ]
            }
          },
          {
            "name": "myScore",
            "type": "i64"
          },
          {
            "name": "oppScore",
            "type": "i64"
          },
          {
            "name": "stake",
            "type": "u64"
          },
          {
            "name": "ts",
            "type": "i64"
          },
          {
            "name": "result",
            "type": "u8"
          },
          {
            "name": "weights",
            "type": {
              "array": [
                "u8",
                6
              ]
            }
          },
          {
            "name": "mutations",
            "type": "u8"
          },
          {
            "name": "rebalances",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "mutationSlot",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "state",
            "type": "u8"
          },
          {
            "name": "kind",
            "type": "u8"
          },
          {
            "name": "a",
            "docs": [
              "DOUBLE / FREEZE: the asset. SWAP: the asset leaving player 0's basket."
            ],
            "type": "u8"
          },
          {
            "name": "b",
            "docs": [
              "SWAP: the asset leaving player 1's basket."
            ],
            "type": "u8"
          },
          {
            "name": "at",
            "docs": [
              "Second of the duel at which it landed."
            ],
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "profile",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "name",
            "type": {
              "array": [
                "u8",
                20
              ]
            }
          },
          {
            "name": "points",
            "type": "u32"
          },
          {
            "name": "wins",
            "type": "u32"
          },
          {
            "name": "losses",
            "type": "u32"
          },
          {
            "name": "draws",
            "type": "u32"
          },
          {
            "name": "streak",
            "docs": [
              "Current streak: > 0 wins in a row, < 0 losses in a row."
            ],
            "type": "i32"
          },
          {
            "name": "bestStreak",
            "type": "u32"
          },
          {
            "name": "games",
            "type": "u32"
          },
          {
            "name": "sumScore",
            "type": "i64"
          },
          {
            "name": "bestScore",
            "type": "i64"
          },
          {
            "name": "mutationsSurvived",
            "docs": [
              "Mutations lived through in duels that were won."
            ],
            "type": "u32"
          },
          {
            "name": "mutationsSeen",
            "type": "u32"
          },
          {
            "name": "createdTs",
            "type": "i64"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "historyLen",
            "type": "u8"
          },
          {
            "name": "historyHead",
            "docs": [
              "Index of the most recent record."
            ],
            "type": "u8"
          },
          {
            "name": "history",
            "type": {
              "array": [
                {
                  "defined": {
                    "name": "matchRecord"
                  }
                },
                8
              ]
            }
          }
        ]
      }
    },
    {
      "name": "sessionTokenV2",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "targetProgram",
            "type": "pubkey"
          },
          {
            "name": "sessionSigner",
            "type": "pubkey"
          },
          {
            "name": "feePayer",
            "type": "pubkey"
          },
          {
            "name": "validUntil",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "table",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "tier",
            "type": "u8"
          },
          {
            "name": "waiting",
            "docs": [
              "The duel waiting for a rival at this table, or the default key."
            ],
            "type": "pubkey"
          },
          {
            "name": "waitingSince",
            "type": "i64"
          },
          {
            "name": "duels",
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "trophy",
      "docs": [
        "A winning basket, recorded by its winner after settlement."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "duel",
            "type": "pubkey"
          },
          {
            "name": "duelId",
            "type": "u64"
          },
          {
            "name": "opponent",
            "type": "pubkey"
          },
          {
            "name": "weights",
            "docs": [
              "The basket as drafted (weights in %, per asset)."
            ],
            "type": {
              "array": [
                "u8",
                6
              ]
            }
          },
          {
            "name": "score",
            "type": "i64"
          },
          {
            "name": "oppScore",
            "type": "i64"
          },
          {
            "name": "stake",
            "type": "u64"
          },
          {
            "name": "mutations",
            "docs": [
              "The three mutations the basket lived through."
            ],
            "type": {
              "array": [
                {
                  "defined": {
                    "name": "mutationSlot"
                  }
                },
                3
              ]
            }
          },
          {
            "name": "mintedTs",
            "type": "i64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    }
  ]
};
