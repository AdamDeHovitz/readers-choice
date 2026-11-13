import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { suggestTheme } from "@readers-choice/contract/themes";
import { useOperationMutation } from "@/api/queries";
import { Alert } from "@/components/alert";
import { Button } from "@/components/button";
import { TextField } from "@/components/text-field";
import { space } from "@/theme";

/** Suggest a theme for the club (themes.suggest). */
export function SuggestTheme({ bookClubId }: { bookClubId: string }) {
  const [name, setName] = useState("");
  const suggest = useOperationMutation(suggestTheme);

  function submit() {
    suggest.mutate({ bookClubId, name }, { onSuccess: () => setName("") });
  }

  return (
    <View style={styles.form}>
      <TextField
        label="Suggest a theme"
        placeholder="e.g. Unreliable narrators"
        value={name}
        onChangeText={(text) => {
          setName(text);
          if (suggest.isError) suggest.reset();
        }}
        returnKeyType="done"
        onSubmitEditing={submit}
      />
      {suggest.isError && <Alert message={suggest.error.message} />}
      <Button
        title="Suggest"
        onPress={submit}
        pending={suggest.isPending}
        disabled={!name.trim()}
      />
    </View>
  );
}

const styles = StyleSheet.create({ form: { gap: space[3] } });
